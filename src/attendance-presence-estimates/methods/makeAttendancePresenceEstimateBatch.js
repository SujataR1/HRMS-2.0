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

const ALGORITHM_VERSION = 2;

function readPositiveIntEnv(name, fallback, { min = 1, max = 360 } = {}) {
	const value = Number(process.env[name]);

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

const PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES = readPositiveIntEnv(
	"PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES",
	30,
	{ min: 1, max: 180 }
);

const PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES = readPositiveIntEnv(
	"PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES",
	5,
	{ min: 1, max: 60 }
);

const PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES = readPositiveIntEnv(
	"PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES",
	10,
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

function buildConsecutiveClusters(logs, windowMinutes) {
	const clusters = [];

	for (const log of logs) {
		const lastCluster = clusters.at(-1);

		if (!lastCluster) {
			clusters.push([log]);
			continue;
		}

		const previousLog = lastCluster.at(-1);
		const gapMinutes = log.timestamp.diff(previousLog.timestamp, "minute");

		if (gapMinutes <= windowMinutes) {
			lastCluster.push(log);
			continue;
		}

		clusters.push([log]);
	}

	return clusters.map((logsInCluster, index) => ({
		index,
		first: logsInCluster[0],
		last: logsInCluster.at(-1),
		logs: logsInCluster,
	}));
}

function buildArrivalBoundaryCluster(logs) {
	let endIndex = 0;

	for (let i = 1; i < logs.length; i++) {
		const gapMinutes = logs[i].timestamp.diff(
			logs[i - 1].timestamp,
			"minute"
		);

		if (gapMinutes > PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES) {
			break;
		}

		endIndex = i;
	}

	const clusterLogs = logs.slice(0, endIndex + 1);

	return {
		index: 0,
		startIndex: 0,
		endIndex,
		first: clusterLogs[0],
		last: clusterLogs.at(-1),
		logs: clusterLogs,
	};
}

function buildExitBoundaryCluster(logs, minimumStartIndex) {
	let startIndex = logs.length - 1;

	for (let i = logs.length - 2; i >= minimumStartIndex; i--) {
		const gapMinutes = logs[i + 1].timestamp.diff(
			logs[i].timestamp,
			"minute"
		);

		if (gapMinutes > PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES) {
			break;
		}

		startIndex = i;
	}

	const clusterLogs = logs.slice(startIndex);

	return {
		index: 0,
		startIndex,
		endIndex: logs.length - 1,
		first: clusterLogs[0],
		last: clusterLogs.at(-1),
		logs: clusterLogs,
	};
}

function serializePunch(log) {
	return {
		atUtc: log.timestamp.utc().toISOString(),
		atLocal: log.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		identifier: log.identifier,
	};
}

function serializeCluster(
	cluster,
	{ role = "unknown", chosenBoundary = null, selectionRule = null } = {}
) {
	return {
		role,
		punchCount: cluster.logs.length,
		firstPunchUtc: cluster.first.timestamp.utc().toISOString(),
		firstPunchLocal: cluster.first.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		lastPunchUtc: cluster.last.timestamp.utc().toISOString(),
		lastPunchLocal: cluster.last.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		chosenBoundaryUtc: chosenBoundary
			? chosenBoundary.utc().toISOString()
			: null,
		chosenBoundaryLocal: chosenBoundary
			? chosenBoundary.format("YYYY-MM-DD HH:mm:ss")
			: null,
		selectionRule,
		punches: cluster.logs.map(serializePunch),
	};
}

function buildInputHash({ item, shiftId, logs }) {
	const payload = {
		algorithmVersion: ALGORITHM_VERSION,
		timezone: TIMEZONE,
		boundaryClusterWindowMinutes:
			PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
		breakClusterWindowMinutes:
			PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
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

function getEstimateConfidence({ flags, middleClusters, usedShiftWindow }) {
	if (flags.includes("noPunches")) return "unknown";
	if (flags.includes("invalidEstimatedWindow")) return "low";
	if (flags.includes("singlePunchOnly")) return "low";
	if (flags.includes("singleBoundaryClusterOnly")) return "low";
	if (flags.includes("unpairedMiddleCluster")) return "low";
	if (!usedShiftWindow) return "low";

	const hasAdjustedBoundary =
		flags.includes("arrivalBoundaryAdjusted") ||
		flags.includes("exitBoundaryAdjusted");

	const hasOutsideDeduction = flags.includes("possibleOutsideIntervalDeducted");

	if (
		middleClusters.length === 0 &&
		!hasAdjustedBoundary &&
		!hasOutsideDeduction
	) {
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
			clusters: {
				boundaryClusterWindowMinutes:
					PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
				breakClusterWindowMinutes:
					PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
				meaningfulOutsideGapMinutes:
					PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
				arrival: null,
				exit: null,
				middle: [],
				outsideIntervals: [],
				notes: ["no raw punches found inside the estimate window"],
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

	const firstRawPunch = logs[0].timestamp.utc().toDate();
	const lastRawPunch = logs.at(-1).timestamp.utc().toDate();

	if (logs.length === 1) {
		flags.push("singlePunchOnly");

		const singleCluster = {
			index: 0,
			first: logs[0],
			last: logs[0],
			logs,
		};

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
			clusters: {
				boundaryClusterWindowMinutes:
					PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
				breakClusterWindowMinutes:
					PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
				meaningfulOutsideGapMinutes:
					PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
				arrival: serializeCluster(singleCluster, {
					role: "singlePunch",
					chosenBoundary: logs[0].timestamp,
					selectionRule: "single punch only; cannot infer exit",
				}),
				exit: null,
				middle: [],
				outsideIntervals: [],
				notes: ["single punch cannot produce inside-duration estimate"],
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

	const arrivalCluster = buildArrivalBoundaryCluster(logs);

	if (arrivalCluster.logs.length > 1) {
		flags.push("multipleArrivalPunches", "arrivalBoundaryAdjusted");
	}

	if (arrivalCluster.endIndex >= logs.length - 1) {
		flags.push("singleBoundaryClusterOnly");

		if (arrivalCluster.logs.length > 1) {
			flags.push("multiplePunchesInSingleBoundaryCluster");
		}

		return {
			employeeId: item.employeeId,
			attendanceDate,

			firstRawPunch,
			lastRawPunch,

			estimatedInsideStart: arrivalCluster.last.timestamp.utc().toDate(),
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "low",
			flags: Array.from(new Set(flags)),
			clusters: {
				boundaryClusterWindowMinutes:
					PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
				breakClusterWindowMinutes:
					PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
				meaningfulOutsideGapMinutes:
					PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
				arrival: serializeCluster(arrivalCluster, {
					role: "arrivalBoundary",
					chosenBoundary: arrivalCluster.last.timestamp,
					selectionRule:
						"latest punch in arrival boundary cluster is estimated inside start",
				}),
				exit: null,
				middle: [],
				outsideIntervals: [],
				notes: [
					"all punches were absorbed into the arrival boundary cluster",
					"this can estimate inside start but cannot estimate inside end",
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

	const exitCluster = buildExitBoundaryCluster(
		logs,
		arrivalCluster.endIndex + 1
	);

	if (exitCluster.logs.length > 1) {
		flags.push("multipleExitPunches", "exitBoundaryAdjusted");
	}

	const middleLogs = logs.slice(
		arrivalCluster.endIndex + 1,
		exitCluster.startIndex
	);

	const middleClusters = buildConsecutiveClusters(
		middleLogs,
		PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES
	);

	const estimatedInsideStart = arrivalCluster.last.timestamp;
	const estimatedInsideEnd = exitCluster.first.timestamp;

	let grossInsideMinutes = estimatedInsideEnd.diff(
		estimatedInsideStart,
		"minute"
	);

	const outsideIntervals = [];

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
				selectionRule:
					"earliest punch in possible exit cluster to latest punch in possible re-entry cluster",
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
				boundaryClusterWindowMinutes:
					PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
				breakClusterWindowMinutes:
					PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
				meaningfulOutsideGapMinutes:
					PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
				arrival: serializeCluster(arrivalCluster, {
					role: "arrivalBoundary",
					chosenBoundary: arrivalCluster.last.timestamp,
					selectionRule:
						"latest punch in arrival boundary cluster is estimated inside start",
				}),
				exit: serializeCluster(exitCluster, {
					role: "exitBoundary",
					chosenBoundary: exitCluster.first.timestamp,
					selectionRule:
						"earliest punch in exit boundary cluster is estimated inside end",
				}),
				middle: middleClusters.map((cluster, index) =>
					serializeCluster(cluster, {
						role:
							index % 2 === 0
								? "possibleMiddleExit"
								: "possibleMiddleReentry",
					})
				),
				outsideIntervals,
				notes: ["estimated inside end is not after estimated inside start"],
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
			middleClusters,
			usedShiftWindow,
		}),
		flags: uniqueFlags,
		clusters: {
			boundaryClusterWindowMinutes:
				PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
			breakClusterWindowMinutes:
				PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
			meaningfulOutsideGapMinutes:
				PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
			arrival: serializeCluster(arrivalCluster, {
				role: "arrivalBoundary",
				chosenBoundary: arrivalCluster.last.timestamp,
				selectionRule:
					"latest punch in arrival boundary cluster is estimated inside start",
			}),
			exit: serializeCluster(exitCluster, {
				role: "exitBoundary",
				chosenBoundary: exitCluster.first.timestamp,
				selectionRule:
					"earliest punch in exit boundary cluster is estimated inside end",
			}),
			middle: middleClusters.map((cluster, index) =>
				serializeCluster(cluster, {
					role:
						index % 2 === 0
							? "possibleMiddleExit"
							: "possibleMiddleReentry",
				})
			),
			outsideIntervals,
			notes: [
				"this is an estimate, not a hard direction fact",
				"arrival and exit boundary clusters use the boundary ambiguity window",
				"middle break clusters use the smaller break/noise window",
				"middle cluster pairs are treated as possible exit and possible re-entry",
				"outside interval is deducted only when it reaches the meaningful outside gap",
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