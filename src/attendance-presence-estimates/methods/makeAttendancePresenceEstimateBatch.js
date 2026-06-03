import { createHash } from "crypto";
import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import pMap from "p-map";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

const ALGORITHM_VERSION = 1;

function readPositiveIntEnv(name, fallback, { min = 1, max = 180 } = {}) {
	const value = Number(process.env[name]);

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

const PRESENCE_ESTIMATE_CLUSTER_WINDOW_MINUTES = readPositiveIntEnv(
	"PRESENCE_ESTIMATE_CLUSTER_WINDOW_MINUTES",
	30,
	{ min: 1, max: 180 }
);

const PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES = readPositiveIntEnv(
	"PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES",
	30,
	{ min: 1, max: 360 }
);

const PRESENCE_ESTIMATE_WRITE_CONCURRENCY = readPositiveIntEnv(
	"ATTENDANCE_WRITE_CONCURRENCY",
	4,
	{ min: 1, max: 10 }
);

function toAttendanceDate(istDay) {
	return new Date(istDay.format("YYYY-MM-DD"));
}

function toLocalStamp(value) {
	if (!value) return null;

	return dayjs
		.utc(value)
		.tz(TIMEZONE)
		.format("YYYY-MM-DD HH:mm:ss");
}

function normalizeEmployeeDays(employeeDays) {
	const unique = new Map();

	for (const item of employeeDays || []) {
		const employeeId = String(item?.employeeId || "").trim();
		const date = item?.date;

		if (!employeeId || !date) continue;

		const day = dayjs.tz(date, TIMEZONE).startOf("day");
		if (!day.isValid()) continue;

		const dayKey = day.format("YYYY-MM-DD");
		const key = `${employeeId}_${dayKey}`;

		if (!unique.has(key)) {
			unique.set(key, {
				employeeId,
				day,
				dayKey,
			});
		}
	}

	return Array.from(unique.values()).sort((a, b) => {
		const byDay = a.day.valueOf() - b.day.valueOf();
		if (byDay !== 0) return byDay;

		return a.employeeId.localeCompare(b.employeeId);
	});
}

function buildEmployeeLogMap(rawLogs) {
	const employeeLogMap = new Map();

	for (const rawLog of rawLogs) {
		const employeeId = rawLog.employeeId;

		if (!employeeLogMap.has(employeeId)) {
			employeeLogMap.set(employeeId, []);
		}

		employeeLogMap.get(employeeId).push({
			employeeId,
			identifier: rawLog.identifier,
			timestamp: dayjs
				.utc(rawLog.timestamp)
				.tz(TIMEZONE)
				.second(0)
				.millisecond(0),
		});
	}

	for (const logs of employeeLogMap.values()) {
		logs.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
	}

	return employeeLogMap;
}

function buildShiftDataMap(shiftDetails) {
	const shiftDataMap = new Map();

	for (const shift of shiftDetails) {
		let fullStart = dayjs.utc(shift.fullShiftStartingTime).tz(TIMEZONE);
		let fullEnd = dayjs.utc(shift.fullShiftEndingTime).tz(TIMEZONE);

		if (fullEnd.isBefore(fullStart)) {
			fullEnd = fullEnd.add(1, "day");
		}

		const fullDur = fullEnd.diff(fullStart, "minute");

		let halfStart = shift.halfShiftStartingTime
			? dayjs.utc(shift.halfShiftStartingTime).tz(TIMEZONE)
			: null;

		let halfEnd = shift.halfShiftEndingTime
			? dayjs.utc(shift.halfShiftEndingTime).tz(TIMEZONE)
			: null;

		if (halfEnd && halfStart && halfEnd.isBefore(halfStart)) {
			halfEnd = halfEnd.add(1, "day");
		}

		const halfDur =
			halfStart && halfEnd
				? halfEnd.diff(halfStart, "minute")
				: Math.floor(fullDur / 2);

		shiftDataMap.set(shift.id, {
			id: shift.id,

			fullStart,
			fullEnd,
			fullDur,

			halfStart,
			halfEnd,
			halfDur,

			earlyFull: shift.fullShiftEarlyPunchConsiderTimeInMinutes ?? 0,
			earlyHalf: shift.halfShiftEarlyPunchConsiderTimeInMinutes ?? 0,

			postTol:
				shift.maximumValidShiftLengthPostRegularEndingTimeInMinutes ?? 0,

			weeklyHalfSet: new Set(
				(shift.weeklyHalfDays || []).map((day) => day.toLowerCase())
			),
		});
	}

	return shiftDataMap;
}

function buildClusters(logs) {
	const clusters = [];

	for (const log of logs) {
		const lastCluster = clusters.at(-1);

		if (!lastCluster) {
			clusters.push([log]);
			continue;
		}

		const previousLog = lastCluster.at(-1);
		const gapMinutes = log.timestamp.diff(previousLog.timestamp, "minute");

		if (gapMinutes <= PRESENCE_ESTIMATE_CLUSTER_WINDOW_MINUTES) {
			lastCluster.push(log);
			continue;
		}

		clusters.push([log]);
	}

	return clusters.map((logsInCluster, index) => {
		const first = logsInCluster[0];
		const last = logsInCluster.at(-1);

		return {
			index,
			first,
			last,
			logs: logsInCluster,
		};
	});
}

function serializeClusters(clusters) {
	return clusters.map((cluster) => ({
		index: cluster.index,
		punchCount: cluster.logs.length,
		firstPunchUtc: cluster.first.timestamp.utc().toISOString(),
		firstPunchLocal: cluster.first.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		lastPunchUtc: cluster.last.timestamp.utc().toISOString(),
		lastPunchLocal: cluster.last.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		punches: cluster.logs.map((log) => ({
			atUtc: log.timestamp.utc().toISOString(),
			atLocal: log.timestamp.format("YYYY-MM-DD HH:mm:ss"),
			identifier: log.identifier,
		})),
	}));
}

function buildInputHash({ item, shiftId, logs }) {
	const payload = {
		algorithmVersion: ALGORITHM_VERSION,
		timezone: TIMEZONE,
		clusterWindowMinutes: PRESENCE_ESTIMATE_CLUSTER_WINDOW_MINUTES,
		meaningfulOutsideGapMinutes:
			PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
		employeeId: item.employeeId,
		dayKey: item.dayKey,
		shiftId,
		logs: logs.map((log) => ({
			atUtc: log.timestamp.utc().toISOString(),
			identifier: log.identifier,
		})),
	};

	return createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex");
}

function resolveWindowedLogs({
	item,
	employeeShiftMap,
	shiftDataMap,
	employeeLogMap,
}) {
	const allEmployeeLogs = employeeLogMap.get(item.employeeId) || [];
	const shiftId = employeeShiftMap.get(item.employeeId);
	const shift = shiftId ? shiftDataMap.get(shiftId) : null;

	if (!shift) {
		const dayStart = item.day.startOf("day");
		const dayEnd = item.day.endOf("day");

		return {
			shiftId: shiftId || null,
			usedShiftWindow: false,
			logs: allEmployeeLogs.filter((log) =>
				log.timestamp.isBetween(dayStart, dayEnd, null, "[]")
			),
		};
	}

	const dayNameLower = item.day.format("dddd").toLowerCase();
	const isHalf = shift.weeklyHalfSet.has(dayNameLower);

	const baseStart =
		isHalf && shift.halfStart ? shift.halfStart : shift.fullStart;

	const baseEnd = isHalf && shift.halfEnd ? shift.halfEnd : shift.fullEnd;

	let windowStart = item.day
		.hour(baseStart.hour())
		.minute(baseStart.minute())
		.second(baseStart.second())
		.millisecond(0);

	let windowEnd = item.day
		.hour(baseEnd.hour())
		.minute(baseEnd.minute())
		.second(baseEnd.second())
		.millisecond(0);

	if (windowEnd.isBefore(windowStart)) {
		windowEnd = windowEnd.add(1, "day");
	}

	windowStart = windowStart.subtract(
		isHalf ? shift.earlyHalf : shift.earlyFull,
		"minute"
	);

	windowEnd = windowEnd.add(shift.postTol, "minute");

	return {
		shiftId,
		usedShiftWindow: true,
		logs: allEmployeeLogs.filter((log) =>
			log.timestamp.isBetween(windowStart, windowEnd, null, "[]")
		),
	};
}

function getEstimateConfidence({ flags, clusters, usedShiftWindow }) {
	if (flags.includes("noPunches")) return "unknown";
	if (flags.includes("invalidEstimatedWindow")) return "low";
	if (flags.includes("singlePunchOnly")) return "low";
	if (flags.includes("singleClusterOnly")) return "low";
	if (flags.includes("unpairedMiddleCluster")) return "low";
	if (!usedShiftWindow) return "low";

	const hasAdjustedBoundary =
		flags.includes("arrivalBoundaryAdjusted") ||
		flags.includes("exitBoundaryAdjusted");

	const hasOutsideDeduction = flags.includes("possibleOutsideIntervalDeducted");

	if (clusters.length === 2 && !hasAdjustedBoundary && !hasOutsideDeduction) {
		return "high";
	}

	return "medium";
}

function computePresenceEstimateRecord({
	item,
	employeeShiftMap,
	shiftDataMap,
	employeeLogMap,
}) {
	const flags = [];

	const { shiftId, usedShiftWindow, logs } = resolveWindowedLogs({
		item,
		employeeShiftMap,
		shiftDataMap,
		employeeLogMap,
	});

	if (!usedShiftWindow) {
		flags.push("noAssignedShift", "calendarDayWindowUsed");
	}

	const attendanceDate = toAttendanceDate(item.day);

	if (!logs.length) {
		flags.push("noPunches");

		return {
			employeeId: item.employeeId,
			attendanceDate,

			firstRawPunch: null,
			lastRawPunch: null,

			estimatedInsideStart: null,
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "unknown",
			flags,
			clusters: [],

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
			}),
			computedAt: new Date(),
		};
	}

	const firstRawPunch = logs[0].timestamp.utc().toDate();
	const lastRawPunch = logs.at(-1).timestamp.utc().toDate();

	const clusters = buildClusters(logs);

	if (logs.length === 1) {
		flags.push("singlePunchOnly");

		return {
			employeeId: item.employeeId,
			attendanceDate,

			firstRawPunch,
			lastRawPunch,

			estimatedInsideStart: firstRawPunch,
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "low",
			flags,
			clusters: serializeClusters(clusters),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
			}),
			computedAt: new Date(),
		};
	}

	if (clusters.length === 1) {
		flags.push("singleClusterOnly");

		if (clusters[0].logs.length > 1) {
			flags.push("multiplePunchesInSingleCluster");
		}

		return {
			employeeId: item.employeeId,
			attendanceDate,

			firstRawPunch,
			lastRawPunch,

			estimatedInsideStart: clusters[0].last.timestamp.utc().toDate(),
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "low",
			flags,
			clusters: serializeClusters(clusters),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
			}),
			computedAt: new Date(),
		};
	}

	const arrivalCluster = clusters[0];
	const exitCluster = clusters.at(-1);

	if (arrivalCluster.logs.length > 1) {
		flags.push("multipleArrivalPunches", "arrivalBoundaryAdjusted");
	}

	if (exitCluster.logs.length > 1) {
		flags.push("multipleExitPunches", "exitBoundaryAdjusted");
	}

	const estimatedInsideStart = arrivalCluster.last.timestamp;
	const estimatedInsideEnd = exitCluster.first.timestamp;

	let grossInsideMinutes = estimatedInsideEnd.diff(
		estimatedInsideStart,
		"minute"
	);

	const outsideIntervals = [];
	const middleClusters = clusters.slice(1, -1);

	for (let i = 0; i < middleClusters.length; i += 2) {
		const possibleExitCluster = middleClusters[i];
		const possibleReentryCluster = middleClusters[i + 1];

		if (!possibleReentryCluster) {
			flags.push("unpairedMiddleCluster");
			continue;
		}

		const possibleOutsideStart = possibleExitCluster.first.timestamp;
		const possibleOutsideEnd = possibleReentryCluster.last.timestamp;

		const possibleOutsideMinutes = possibleOutsideEnd.diff(
			possibleOutsideStart,
			"minute"
		);

		if (
			possibleOutsideMinutes >=
			PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES
		) {
			outsideIntervals.push({
				fromUtc: possibleOutsideStart.utc().toISOString(),
				fromLocal: possibleOutsideStart.format("YYYY-MM-DD HH:mm:ss"),
				toUtc: possibleOutsideEnd.utc().toISOString(),
				toLocal: possibleOutsideEnd.format("YYYY-MM-DD HH:mm:ss"),
				minutes: possibleOutsideMinutes,
			});

			flags.push("possibleOutsideIntervalDeducted");
			continue;
		}

		flags.push("shortMiddleGapIgnored");
	}

	if (grossInsideMinutes <= 0) {
		flags.push("invalidEstimatedWindow");

		return {
			employeeId: item.employeeId,
			attendanceDate,

			firstRawPunch,
			lastRawPunch,

			estimatedInsideStart: estimatedInsideStart.utc().toDate(),
			estimatedInsideEnd: estimatedInsideEnd.utc().toDate(),
			estimatedInsideMinutes: null,

			confidence: "low",
			flags: Array.from(new Set(flags)),
			clusters: {
				clusterWindowMinutes: PRESENCE_ESTIMATE_CLUSTER_WINDOW_MINUTES,
				meaningfulOutsideGapMinutes:
					PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
				items: serializeClusters(clusters),
				outsideIntervals,
			},

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
			}),
			computedAt: new Date(),
		};
	}

	const deductedOutsideMinutes = outsideIntervals.reduce(
		(total, interval) => total + interval.minutes,
		0
	);

	const estimatedInsideMinutes = Math.max(
		0,
		grossInsideMinutes - deductedOutsideMinutes
	);

	const uniqueFlags = Array.from(new Set(flags));

	return {
		employeeId: item.employeeId,
		attendanceDate,

		firstRawPunch,
		lastRawPunch,

		estimatedInsideStart: estimatedInsideStart.utc().toDate(),
		estimatedInsideEnd: estimatedInsideEnd.utc().toDate(),
		estimatedInsideMinutes,

		confidence: getEstimateConfidence({
			flags: uniqueFlags,
			clusters,
			usedShiftWindow,
		}),
		flags: uniqueFlags,
		clusters: {
			clusterWindowMinutes: PRESENCE_ESTIMATE_CLUSTER_WINDOW_MINUTES,
			meaningfulOutsideGapMinutes:
				PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
			items: serializeClusters(clusters),
			outsideIntervals,
			notes: [
				"first cluster latest punch is treated as estimated inside start",
				"last cluster earliest punch is treated as estimated inside end",
				"middle cluster pairs may be treated as possible outside intervals",
				"this is an estimate, not a hard direction fact",
			],
		},

		algorithmVersion: ALGORITHM_VERSION,
		inputHash: buildInputHash({
			item,
			shiftId,
			logs,
		}),
		computedAt: new Date(),
	};
}

/**
 * Recompute stored presence estimates for explicit employee-day pairs.
 *
 * Raw biometric logs are facts.
 * Presence estimates are derived facts.
 *
 * This function never incrementally mutates estimates.
 * It recomputes each affected employee-day from current raw facts and upserts
 * the latest derived estimate.
 *
 * @param {{
 *   employeeDays: Array<{ employeeId: string, date: string | Date }>
 * }} input
 */
export async function makeAttendancePresenceEstimateBatch({
	employeeDays = [],
} = {}) {
	const normalizedEmployeeDays = normalizeEmployeeDays(employeeDays);

	if (!normalizedEmployeeDays.length) {
		return {
			processed: 0,
			upserted: 0,
		};
	}

	const employeeIds = Array.from(
		new Set(normalizedEmployeeDays.map((item) => item.employeeId))
	);

	const firstDay = normalizedEmployeeDays[0].day.startOf("day");
	const lastDay = normalizedEmployeeDays.at(-1).day.endOf("day");

	const assignments = await prisma.employeeDetails.findMany({
		where: {
			employeeId: {
				in: employeeIds,
			},
		},
		select: {
			employeeId: true,
			assignedShiftId: true,
		},
	});

	const employeeShiftMap = new Map(
		assignments
			.filter((assignment) => assignment.assignedShiftId)
			.map((assignment) => [
				assignment.employeeId,
				assignment.assignedShiftId,
			])
	);

	const relevantShiftIds = Array.from(new Set(employeeShiftMap.values()));

	const [rawLogs, shiftDetails] = await Promise.all([
		prisma.biometricLog.findMany({
			where: {
				employeeId: {
					in: employeeIds,
				},
				timestamp: {
					gte: firstDay.subtract(1, "day").utc().toDate(),
					lte: lastDay.add(1, "day").utc().toDate(),
				},
			},
			select: {
				employeeId: true,
				timestamp: true,
				identifier: true,
			},
			orderBy: {
				timestamp: "asc",
			},
		}),

		relevantShiftIds.length
			? prisma.shift.findMany({
					where: {
						id: {
							in: relevantShiftIds,
						},
					},
				})
			: [],
	]);

	const employeeLogMap = buildEmployeeLogMap(rawLogs);
	const shiftDataMap = buildShiftDataMap(shiftDetails);

	const records = normalizedEmployeeDays.map((item) =>
		computePresenceEstimateRecord({
			item,
			employeeShiftMap,
			shiftDataMap,
			employeeLogMap,
		})
	);

	let upserted = 0;

	await pMap(
		records,
		async (record) => {
			await prisma.attendancePresenceEstimate.upsert({
				where: {
					employeeId_attendanceDate: {
						employeeId: record.employeeId,
						attendanceDate: record.attendanceDate,
					},
				},
				create: record,
				update: record,
			});

			upserted += 1;
		},
		{
			concurrency: PRESENCE_ESTIMATE_WRITE_CONCURRENCY,
		}
	);

	return {
		processed: normalizedEmployeeDays.length,
		upserted,
	};
}