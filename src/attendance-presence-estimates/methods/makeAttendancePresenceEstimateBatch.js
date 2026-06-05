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

const ALGORITHM_VERSION = 10;
const PRESENCE_RECORD_WRITE_CONCURRENCY = 4;

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

/**
 * Collapse only exact same-timestamp raw duplicates.
 *
 * This is not clustering.
 * Different seconds remain different punches.
 *
 * Same exact timestamp:
 *   in + null     => in
 *   out + null    => out
 *   null + null   => null
 *   in + out      => conflict
 */
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

function hasOnlyDirectionalPunches(punches) {
	if (!punches.length) return false;

	const directionCoverage = classifyPunchStateCoverage(punches);

	return directionCoverage.mode === "directional";
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

function buildInsideSession({ fromPunch, toPunch }) {
	return {
		fromUtc: fromPunch.timestamp.utc().toISOString(),
		fromLocal: fromPunch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		toUtc: toPunch.timestamp.utc().toISOString(),
		toLocal: toPunch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		minutes: toPunch.timestamp.diff(fromPunch.timestamp, "minute"),
		source: "directionalPunchState",
		selectionRule: "in punchState followed by out punchState",
	};
}

function buildOutsideInterval({ fromPunch, toPunch }) {
	return {
		fromUtc: fromPunch.timestamp.utc().toISOString(),
		fromLocal: fromPunch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		toUtc: toPunch.timestamp.utc().toISOString(),
		toLocal: toPunch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		minutes: toPunch.timestamp.diff(fromPunch.timestamp, "minute"),
		source: "directionalPunchState",
		selectionRule: "out punchState followed by in punchState",
	};
}

function buildOpenInsideSession(punch) {
	return {
		fromUtc: punch.timestamp.utc().toISOString(),
		fromLocal: punch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		toUtc: null,
		toLocal: null,
		minutes: null,
		status: "open",
		source: "directionalPunchState",
		selectionRule: "latest state is inside",
	};
}

function buildAnomaly({
	code,
	atPunch,
	message,
	previousState = null,
	currentState = null,
}) {
	return {
		type: "anomaly",
		code,
		atUtc: atPunch.timestamp.utc().toISOString(),
		atLocal: atPunch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		punch: serializePunch(atPunch),
		previousState,
		currentState,
		message,
	};
}

function isForwardTransition({ fromPunch, toPunch }) {
	return Boolean(
		fromPunch &&
			toPunch &&
			toPunch.timestamp.isAfter(fromPunch.timestamp)
	);
}

function buildDirectionalStateHistory(punches) {
	const insideSessions = [];
	const outsideIntervals = [];
	const anomalies = [];

	let currentState = null;
	let openInsidePunch = null;
	let openOutsidePunch = null;
	let lastDirectionalPunch = null;

	for (const punch of punches) {
		if (punch.punchState === "in") {
			lastDirectionalPunch = punch;

			if (currentState === null) {
				currentState = "inside";
				openInsidePunch = punch;
				openOutsidePunch = null;
				continue;
			}

			if (currentState === "inside") {
				anomalies.push(
					buildAnomaly({
						code: "repeatedInWithoutOut",
						atPunch: punch,
						previousState: "inside",
						currentState: "inside",
						message:
							"In punch occurred while already inside. Punch was recorded as anomaly and ignored for state mutation.",
					})
				);

				continue;
			}

			if (currentState === "outside") {
				if (!openOutsidePunch) {
					currentState = "inside";
					openInsidePunch = punch;
					openOutsidePunch = null;
					continue;
				}

				if (!isForwardTransition({ fromPunch: openOutsidePunch, toPunch: punch })) {
					anomalies.push(
						buildAnomaly({
							code: "invalidOutsideIntervalOrder",
							atPunch: punch,
							previousState: "outside",
							currentState: "outside",
							message:
								"Out→in interval was not chronologically forward. In punch was recorded as anomaly and ignored for state mutation.",
						})
					);

					continue;
				}

				const outsideInterval = buildOutsideInterval({
					fromPunch: openOutsidePunch,
					toPunch: punch,
				});

				outsideIntervals.push(outsideInterval);

				currentState = "inside";
				openInsidePunch = punch;
				openOutsidePunch = null;
			}

			continue;
		}

		if (punch.punchState === "out") {
			lastDirectionalPunch = punch;

			if (currentState === null) {
				anomalies.push(
					buildAnomaly({
						code: "initialOutWithoutIn",
						atPunch: punch,
						previousState: null,
						currentState: null,
						message:
							"First directional punch is out. Punch was recorded as anomaly and ignored for state mutation.",
					})
				);

				continue;
			}

			if (currentState === "outside") {
				anomalies.push(
					buildAnomaly({
						code: "repeatedOutWithoutIn",
						atPunch: punch,
						previousState: "outside",
						currentState: "outside",
						message:
							"Out punch occurred while already outside. Punch was recorded as anomaly and ignored for state mutation.",
					})
				);

				continue;
			}

			if (currentState === "inside") {
				if (!openInsidePunch) {
					anomalies.push(
						buildAnomaly({
							code: "outWithoutOpenInsideAnchor",
							atPunch: punch,
							previousState: "inside",
							currentState: "inside",
							message:
								"Out punch occurred while state was inside, but no inside anchor existed. Punch was recorded as anomaly and ignored for state mutation.",
						})
					);

					continue;
				}

				if (!isForwardTransition({ fromPunch: openInsidePunch, toPunch: punch })) {
					anomalies.push(
						buildAnomaly({
							code: "invalidInsideSessionOrder",
							atPunch: punch,
							previousState: "inside",
							currentState: "inside",
							message:
								"In→out session was not chronologically forward. Punch was recorded as anomaly and ignored for state mutation.",
						})
					);

					continue;
				}

				const insideSession = buildInsideSession({
					fromPunch: openInsidePunch,
					toPunch: punch,
				});

				insideSessions.push(insideSession);

				currentState = "outside";
				openOutsidePunch = punch;
				openInsidePunch = null;
			}
		}
	}

	const currentlyIn = currentState === "inside";

	const openInsideSession =
		currentlyIn && openInsidePunch
			? buildOpenInsideSession(openInsidePunch)
			: null;

	return {
		currentState: currentState || "unknown",
		currentlyIn,
		lastDirectionalPunch: lastDirectionalPunch
			? serializePunch(lastDirectionalPunch)
			: null,

		openInsideSession,

		// Intentionally never emitted.
		// A final out means "currentlyIn=false", not "open break".
		openOutsideInterval: null,

		insideSessions,
		outsideIntervals,
		anomalies,
	};
}

function buildInputHash({ item, shiftId, punches }) {
	const payload = {
		algorithmVersion: ALGORITHM_VERSION,
		timezone: TIMEZONE,
		mode: "directionalState",
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
		return {
			shiftId: shiftId || null,
			usedShiftWindow: false,
			punches: [],
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

function sumClosedMinutes(items) {
	return items.reduce((total, item) => {
		const minutes = Number(item.minutes);

		return Number.isFinite(minutes) ? total + minutes : total;
	}, 0);
}

function firstUsableInsideStart({ insideSessions, openInsideSession }) {
	if (insideSessions.length) {
		return dayjs.utc(insideSessions[0].fromUtc).toDate();
	}

	if (openInsideSession?.fromUtc) {
		return dayjs.utc(openInsideSession.fromUtc).toDate();
	}

	return null;
}

function currentInsideEnd({ currentlyIn, insideSessions }) {
	if (currentlyIn) return null;

	if (insideSessions.length) {
		return dayjs.utc(insideSessions.at(-1).toUtc).toDate();
	}

	return null;
}

function buildClustersPayload({
	directionCoverage,
	rawLogicalPunches,
	currentState,
	currentlyIn,
	lastDirectionalPunch,
	openInsideSession,
	openOutsideInterval,
	insideSessions,
	outsideIntervals,
	anomalies,
	notes = [],
}) {
	return {
		mode: "directionalState",

		// Stored for audit/backward compatibility only.
		// Public API should use currentlyIn instead of exposing inside/outside state.
		currentState,

		currentlyIn,
		lastDirectionalPunch,
		directionCoverage,

		rawLogicalPunches: rawLogicalPunches.map(serializePunch),

		openInsideSession,

		// Always null by design.
		// Final out is not an open break.
		openOutsideInterval,

		insideSessions,
		outsideIntervals,
		anomalies,

		notes,
	};
}

function computePresenceConfidence({ anomalies }) {
	return anomalies.length ? "medium" : "high";
}

function buildDirectionalPresenceRecord({
	item,
	shiftId,
	usedShiftWindow,
	rawLogicalPunches,
	directionCoverage,
}) {
	if (!hasOnlyDirectionalPunches(rawLogicalPunches)) {
		return null;
	}

	const stateHistory = buildDirectionalStateHistory(rawLogicalPunches);

	if (!stateHistory) {
		return null;
	}

	const {
		currentState,
		currentlyIn,
		lastDirectionalPunch,
		openInsideSession,
		openOutsideInterval,
		insideSessions,
		outsideIntervals,
		anomalies,
	} = stateHistory;

	const completedInsideMinutes = sumClosedMinutes(insideSessions);
	const estimatedInsideMinutes = currentlyIn ? null : completedInsideMinutes;

	const estimatedInsideStart = firstUsableInsideStart({
		insideSessions,
		openInsideSession,
	});

	const estimatedInsideEnd = currentInsideEnd({
		currentlyIn,
		insideSessions,
	});

	const flags = Array.from(
		new Set([
			"directionalPunchStateMode",
			"directionalStatePresenceRecord",
			"breaksDisplayedFromDirectionalOutInPairs",
			currentlyIn ? "currentlyIn" : "currentlyNotIn",
			...(usedShiftWindow ? [] : ["missingAssignedShiftSkipped"]),
			...anomalies.map((anomaly) => anomaly.code),
		])
	);

	return {
		employeeId: item.employeeId,
		attendanceDate: toAttendanceDate(item.day),

		firstRawPunch: rawLogicalPunches[0]?.timestamp.utc().toDate() ?? null,
		lastRawPunch: rawLogicalPunches.at(-1)?.timestamp.utc().toDate() ?? null,

		estimatedInsideStart,
		estimatedInsideEnd,
		estimatedInsideMinutes,

		confidence: computePresenceConfidence({
			anomalies,
		}),
		flags,

		clusters: buildClustersPayload({
			directionCoverage,
			rawLogicalPunches,
			currentState,
			currentlyIn,
			lastDirectionalPunch,
			openInsideSession,
			openOutsideInterval,
			insideSessions,
			outsideIntervals,
			anomalies,
			notes: [
				"presence record uses directional punchState only",
				"no env estimator knobs are used",
				"no breakPolicy is used",
				"no boundary clustering is used",
				"no identifier side-hints are used",
				"shift timing only selects which punches belong to this employee-day",
				"inside sessions are completed in→out transitions only",
				"breaks are completed out→in transitions only",
				"sub-minute valid directional transitions are accepted with minutes=0",
				"final out means currentlyIn=false; it is not emitted as an open break",
				"anomalous punches are recorded as audit facts and ignored for state mutation",
				"repeated same-direction punches do not replace active anchors",
				"null/conflict punchState employee-days are skipped without DB mutation",
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

	if (!usedShiftWindow) {
		return null;
	}

	if (!punches.length) {
		return null;
	}

	const directionCoverage = classifyPunchStateCoverage(punches);

	if (directionCoverage.mode !== "directional") {
		return null;
	}

	return buildDirectionalPresenceRecord({
		item,
		shiftId,
		usedShiftWindow,
		rawLogicalPunches: punches,
		directionCoverage,
	});
}

/**
 * Recompute stored directional presence records for explicit employee-day pairs.
 *
 * Raw biometric logs are facts.
 * Directional presence records are derived facts.
 *
 * This function:
 * - uses no env estimator knobs
 * - uses no break policy
 * - uses no boundary clustering
 * - uses no identifier side-hints
 * - uses only assigned shift timing to select relevant punches
 * - collapses only exact same-timestamp duplicate raw rows
 * - skips employee-days with null/conflict/non-directional punchState
 * - upserts directional state/history when directionality is usable
 *
 * It does not delete stale rows.
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
			concurrency: PRESENCE_RECORD_WRITE_CONCURRENCY,
		}
	);

	return {
		processed: normalizedEmployeeDays.length,
		upserted,
	};
}