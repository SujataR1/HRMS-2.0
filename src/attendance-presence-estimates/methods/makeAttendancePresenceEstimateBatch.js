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

const ALGORITHM_VERSION = 7;

function readPositiveIntEnv(name, fallback, { min = 1, max = 360 } = {}) {
	const value = Number(process.env[name]);

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

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

function normalizePunchState(value) {
	if (value === "in") return "in";
	if (value === "out") return "out";

	return null;
}

function buildShiftDataMap(shiftDetails) {
	const shiftDataMap = new Map();

	for (const shift of shiftDetails) {
		let fullStart = dayjs.utc(shift.fullShiftStartingTime).tz(TIMEZONE);
		let fullEnd = dayjs.utc(shift.fullShiftEndingTime).tz(TIMEZONE);

		if (fullEnd.isBefore(fullStart)) {
			fullEnd = fullEnd.add(1, "day");
		}

		let halfStart = shift.halfShiftStartingTime
			? dayjs.utc(shift.halfShiftStartingTime).tz(TIMEZONE)
			: null;

		let halfEnd = shift.halfShiftEndingTime
			? dayjs.utc(shift.halfShiftEndingTime).tz(TIMEZONE)
			: null;

		if (halfEnd && halfStart && halfEnd.isBefore(halfStart)) {
			halfEnd = halfEnd.add(1, "day");
		}

		shiftDataMap.set(shift.id, {
			id: shift.id,

			fullStart,
			fullEnd,

			halfStart,
			halfEnd,

			earlyFull: shift.fullShiftEarlyPunchConsiderTimeInMinutes ?? 0,
			earlyHalf: shift.halfShiftEarlyPunchConsiderTimeInMinutes ?? 0,

			postTol:
				shift.maximumValidShiftLengthPostRegularEndingTimeInMinutes ?? 0,

			overtimeMax: shift.overtimeMaximumAllowableLimitInMinutes ?? 0,

			weeklyHalfSet: new Set(
				(shift.weeklyHalfDays || []).map((day) => day.toLowerCase())
			),
		});
	}

	return shiftDataMap;
}

function buildEmployeeLogicalPunchMap(rawLogs) {
	const employeePunchBucketMap = new Map();

	for (const rawLog of rawLogs) {
		const employeeId = rawLog.employeeId;

		if (!employeePunchBucketMap.has(employeeId)) {
			employeePunchBucketMap.set(employeeId, new Map());
		}

		const timestamp = dayjs
			.utc(rawLog.timestamp)
			.tz(TIMEZONE)
			.second(0)
			.millisecond(0);

		const punchKey = timestamp.utc().toISOString();
		const employeeBuckets = employeePunchBucketMap.get(employeeId);

		if (!employeeBuckets.has(punchKey)) {
			employeeBuckets.set(punchKey, {
				employeeId,
				timestamp,
				identifiers: new Set(),
				punchStates: new Set(),
				rawRowCount: 0,
			});
		}

		const bucket = employeeBuckets.get(punchKey);

		bucket.identifiers.add(rawLog.identifier || "unknown");

		const punchState = normalizePunchState(rawLog.punchState);

		if (punchState) {
			bucket.punchStates.add(punchState);
		}

		bucket.rawRowCount += 1;
	}

	const employeeLogicalPunchMap = new Map();

	for (const [employeeId, bucketMap] of employeePunchBucketMap.entries()) {
		const logicalPunches = Array.from(bucketMap.values())
			.map((bucket) => {
				const punchStates = Array.from(bucket.punchStates);
				let punchState = null;

				if (punchStates.length === 1) {
					punchState = punchStates[0];
				} else if (punchStates.length > 1) {
					punchState = "conflict";
				}

				return {
					employeeId,
					timestamp: bucket.timestamp,
					identifiers: Array.from(bucket.identifiers).sort(),
					punchStates,
					punchState,
					rawRowCount: bucket.rawRowCount,
				};
			})
			.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());

		employeeLogicalPunchMap.set(employeeId, logicalPunches);
	}

	return employeeLogicalPunchMap;
}

function classifyPunchStateCoverage(punches) {
	let directionalCount = 0;
	let unknownCount = 0;
	let conflictCount = 0;

	for (const punch of punches) {
		if (punch.punchState === "in" || punch.punchState === "out") {
			directionalCount += 1;
			continue;
		}

		if (punch.punchState === "conflict") {
			conflictCount += 1;
			continue;
		}

		unknownCount += 1;
	}

	if (directionalCount === 0) {
		return {
			mode: "undirected",
			directionalCount,
			unknownCount,
			conflictCount,
		};
	}

	if (unknownCount || conflictCount) {
		return {
			mode: "hybrid",
			directionalCount,
			unknownCount,
			conflictCount,
		};
	}

	return {
		mode: "directional",
		directionalCount,
		unknownCount,
		conflictCount,
	};
}

function isFullyDirectionalEmployeeDay(punches) {
	if (!punches.length) return false;

	const directionCoverage = classifyPunchStateCoverage(punches);

	if (directionCoverage.mode !== "directional") return false;

	const hasIn = punches.some((punch) => punch.punchState === "in");
	const hasOut = punches.some((punch) => punch.punchState === "out");

	if (!hasIn || !hasOut) return false;

	if (punches[0].punchState !== "in") return false;
	if (punches.at(-1).punchState !== "out") return false;

	return true;
}

function compressConsecutiveDirectionalPunches(punches) {
	const compressed = [];
	const flags = [];

	for (const punch of punches) {
		const previous = compressed.at(-1);

		if (!previous) {
			compressed.push(punch);
			continue;
		}

		if (previous.punchState === punch.punchState) {
			compressed[compressed.length - 1] = punch;

			flags.push(
				punch.punchState === "in"
					? "consecutiveInPunchesCompressedToLatest"
					: "consecutiveOutPunchesCompressedToLatest"
			);

			continue;
		}

		compressed.push(punch);
	}

	return {
		punches: compressed,
		flags: Array.from(new Set(flags)),
	};
}

function serializePunch(punch) {
	return {
		atUtc: punch.timestamp.utc().toISOString(),
		atLocal: punch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		identifiers: punch.identifiers,
		punchState: punch.punchState,
		punchStates: punch.punchStates,
		rawRowCount: punch.rawRowCount,
	};
}

function buildInputHash({ item, shiftId, punches }) {
	const payload = {
		algorithmVersion: ALGORITHM_VERSION,
		timezone: TIMEZONE,
		mode: "directionalOnly",
		employeeId: item.employeeId,
		dayKey: item.dayKey,
		shiftId,
		punches: punches.map((punch) => ({
			atUtc: punch.timestamp.utc().toISOString(),
			identifiers: punch.identifiers,
			punchState: punch.punchState,
			punchStates: punch.punchStates,
			rawRowCount: punch.rawRowCount,
		})),
	};

	return createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex");
}

function resolveWindowedPunches({
	item,
	employeeShiftMap,
	shiftDataMap,
	employeeLogicalPunchMap,
}) {
	const allEmployeePunches = employeeLogicalPunchMap.get(item.employeeId) || [];
	const shiftId = employeeShiftMap.get(item.employeeId);
	const shift = shiftId ? shiftDataMap.get(shiftId) : null;

	if (!shift) {
		const dayStart = item.day.startOf("day");
		const dayEnd = item.day.endOf("day");

		return {
			shiftId: shiftId || null,
			usedShiftWindow: false,
			punches: allEmployeePunches.filter((punch) =>
				punch.timestamp.isBetween(dayStart, dayEnd, null, "[]")
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

	const postShiftLookaheadMinutes = Math.max(
		shift.postTol || 0,
		shift.overtimeMax || 0
	);

	windowEnd = windowEnd.add(postShiftLookaheadMinutes, "minute");

	return {
		shiftId,
		usedShiftWindow: true,
		punches: allEmployeePunches.filter((punch) =>
			punch.timestamp.isBetween(windowStart, windowEnd, null, "[]")
		),
	};
}

function buildDirectionalSessionsAndBreaks({ punches }) {
	const insideSessions = [];
	const outsideIntervals = [];

	for (let i = 0; i < punches.length - 1; i += 1) {
		const current = punches[i];
		const next = punches[i + 1];

		const minutes = next.timestamp.diff(current.timestamp, "minute");

		if (minutes <= 0) {
			return null;
		}

		if (current.punchState === "in" && next.punchState === "out") {
			insideSessions.push({
				fromUtc: current.timestamp.utc().toISOString(),
				fromLocal: current.timestamp.format("YYYY-MM-DD HH:mm:ss"),
				toUtc: next.timestamp.utc().toISOString(),
				toLocal: next.timestamp.format("YYYY-MM-DD HH:mm:ss"),
				minutes,
				source: "directionalPunchState",
			});

			continue;
		}

		if (current.punchState === "out" && next.punchState === "in") {
			outsideIntervals.push({
				fromUtc: current.timestamp.utc().toISOString(),
				fromLocal: current.timestamp.format("YYYY-MM-DD HH:mm:ss"),
				toUtc: next.timestamp.utc().toISOString(),
				toLocal: next.timestamp.format("YYYY-MM-DD HH:mm:ss"),
				minutes,
				source: "directionalPunchState",
				selectionRule: "out punchState followed by in punchState",
			});

			continue;
		}

		return null;
	}

	return {
		insideSessions,
		outsideIntervals,
	};
}

function buildClustersPayload({
	directionCoverage,
	rawLogicalPunches,
	compressedDirectionalPunches,
	insideSessions,
	outsideIntervals,
	notes = [],
}) {
	return {
		mode: "directionalOnly",
		directionCoverage,

		rawLogicalPunches: rawLogicalPunches.map(serializePunch),
		compressedDirectionalPunches:
			compressedDirectionalPunches.map(serializePunch),

		insideSessions,
		outsideIntervals,

		notes,
	};
}

function buildDirectionalEstimate({
	item,
	shiftId,
	usedShiftWindow,
	rawLogicalPunches,
	directionCoverage,
}) {
	const {
		punches: compressedDirectionalPunches,
		flags: compressionFlags,
	} = compressConsecutiveDirectionalPunches(rawLogicalPunches);

	if (!isFullyDirectionalEmployeeDay(compressedDirectionalPunches)) {
		return null;
	}

	const sessionsAndBreaks = buildDirectionalSessionsAndBreaks({
		punches: compressedDirectionalPunches,
	});

	if (!sessionsAndBreaks) {
		return null;
	}

	const { insideSessions, outsideIntervals } = sessionsAndBreaks;

	if (!insideSessions.length) {
		return null;
	}

	const firstPunch = compressedDirectionalPunches[0];
	const lastPunch = compressedDirectionalPunches.at(-1);

	const estimatedInsideMinutes = insideSessions.reduce(
		(total, session) => total + session.minutes,
		0
	);

	const uniqueFlags = Array.from(
		new Set([
			"directionalPunchStateMode",
			"fullyDirectionalPresenceEstimate",
			"breaksDisplayedFromDirectionalOutInPairs",
			...(usedShiftWindow ? [] : ["calendarDayWindowUsed"]),
			...compressionFlags,
		])
	);

	return {
		employeeId: item.employeeId,
		attendanceDate: toAttendanceDate(item.day),

		firstRawPunch: rawLogicalPunches[0].timestamp.utc().toDate(),
		lastRawPunch: rawLogicalPunches.at(-1).timestamp.utc().toDate(),

		estimatedInsideStart: firstPunch.timestamp.utc().toDate(),
		estimatedInsideEnd: lastPunch.timestamp.utc().toDate(),
		estimatedInsideMinutes,

		confidence: "high",
		flags: uniqueFlags,

		clusters: buildClustersPayload({
			directionCoverage,
			rawLogicalPunches,
			compressedDirectionalPunches,
			insideSessions,
			outsideIntervals,
			notes: [
				"presence estimate is stored only for fully directional employee-days",
				"every logical punch must have punchState in/out",
				"no breakPolicy is used",
				"no boundary fallback is used",
				"inside sessions are direct in→out pairs",
				"breaks are direct out→in intervals",
				"mixed, null, conflict, or non-directional employee-days are skipped without DB mutation",
			],
		}),

		algorithmVersion: ALGORITHM_VERSION,
		inputHash: buildInputHash({
			item,
			shiftId,
			punches: rawLogicalPunches,
		}),
		computedAt: new Date(),
	};
}

function computePresenceEstimateRecord({
	item,
	employeeShiftMap,
	shiftDataMap,
	employeeLogicalPunchMap,
}) {
	const { shiftId, usedShiftWindow, punches } = resolveWindowedPunches({
		item,
		employeeShiftMap,
		shiftDataMap,
		employeeLogicalPunchMap,
	});

	if (!punches.length) {
		return null;
	}

	const directionCoverage = classifyPunchStateCoverage(punches);

	if (directionCoverage.mode !== "directional") {
		return null;
	}

	if (!isFullyDirectionalEmployeeDay(punches)) {
		return null;
	}

	return buildDirectionalEstimate({
		item,
		shiftId,
		usedShiftWindow,
		rawLogicalPunches: punches,
		directionCoverage,
	});
}

/**
 * Recompute stored presence estimates for explicit employee-day pairs.
 *
 * Raw biometric logs are facts.
 * Presence estimates are derived facts.
 *
 * This function does not create fallback estimates.
 * This function does not delete stale estimates.
 *
 * It only upserts when every logical punch for that employee-day has usable
 * directionality through BiometricLog.punchState.
 *
 * If an employee-day is mixed, null-only, conflict-heavy, or non-directional,
 * this function does nothing for that employee-day.
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
				punchState: true,
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

	const employeeLogicalPunchMap = buildEmployeeLogicalPunchMap(rawLogs);
	const shiftDataMap = buildShiftDataMap(shiftDetails);

	const records = normalizedEmployeeDays
		.map((item) =>
			computePresenceEstimateRecord({
				item,
				employeeShiftMap,
				shiftDataMap,
				employeeLogicalPunchMap,
			})
		)
		.filter(Boolean);

	if (!records.length) {
		return {
			processed: normalizedEmployeeDays.length,
			upserted: 0,
		};
	}

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