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

const ALGORITHM_VERSION = 5;

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

const PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES =
	readPositiveIntEnv("PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES", 90, {
		min: 1,
		max: 480,
	});

const PRESENCE_ESTIMATE_WRITE_CONCURRENCY = readPositiveIntEnv(
	"ATTENDANCE_WRITE_CONCURRENCY",
	4,
	{ min: 1, max: 10 }
);

const DEFAULT_SIGNAL_HINTS = {
	exitIdentifiers: ["fingerprint"],
	entryIdentifiers: ["card"],
	ignoredIdentifiers: ["unknown"],
};

const DEFAULT_BREAK_POLICY = {
	version: 1,
	source: "fallback",
	signalHints: DEFAULT_SIGNAL_HINTS,
	breaks: [],
	unclassifiedBreaks: {
		deduct: false,
		flagOnly: true,
	},
};

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

function normalizeIdentifierArray(value, fallback) {
	if (!Array.isArray(value)) return fallback;

	const allowed = new Set(["fingerprint", "card", "unknown"]);

	const normalized = value
		.map((item) => String(item || "").trim())
		.filter((item) => allowed.has(item));

	return normalized.length ? Array.from(new Set(normalized)) : fallback;
}

function normalizePositiveInteger(value, fallback) {
	const parsed = Number(value);

	if (!Number.isInteger(parsed)) return fallback;
	if (parsed <= 0) return fallback;

	return parsed;
}

function normalizeBreakRule(rawRule) {
	if (!rawRule || typeof rawRule !== "object") return null;

	const key = String(rawRule.key || "").trim();
	const label = String(rawRule.label || key).trim();
	const kind = rawRule.kind;

	if (!key || !label) return null;

	if (!["timeBound", "freeDuration", "floatingAllowance"].includes(kind)) {
		return null;
	}

	if (kind === "floatingAllowance") {
		const minSegmentMinutes = normalizePositiveInteger(
			rawRule.minSegmentMinutes ?? rawRule.minMinutes,
			1
		);

		const maxTotalMinutes = normalizePositiveInteger(
			rawRule.maxTotalMinutes ?? rawRule.maxMinutes,
			null
		);

		if (!maxTotalMinutes) return null;

		return {
			key,
			label,
			kind,
			minSegmentMinutes,
			maxTotalMinutes,
			deduct: rawRule.deduct !== false,
		};
	}

	const minMinutes = normalizePositiveInteger(rawRule.minMinutes, null);
	const maxMinutes = normalizePositiveInteger(rawRule.maxMinutes, null);

	if (!minMinutes || !maxMinutes) return null;
	if (maxMinutes < minMinutes) return null;

	const normalized = {
		key,
		label,
		kind,
		minMinutes,
		maxMinutes,
		maxOccurrences:
			rawRule.maxOccurrences == null
				? null
				: normalizePositiveInteger(rawRule.maxOccurrences, null),
		deduct: rawRule.deduct !== false,
	};

	if (kind === "timeBound") {
		const windowStart = String(rawRule.windowStart || "").trim();
		const windowEnd = String(rawRule.windowEnd || "").trim();

		if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(windowStart)) return null;
		if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(windowEnd)) return null;
		if (windowStart === windowEnd) return null;

		normalized.windowStart = windowStart;
		normalized.windowEnd = windowEnd;
	}

	return normalized;
}

function normalizeBreakPolicy(rawPolicy) {
	if (!rawPolicy || typeof rawPolicy !== "object") {
		return {
			...DEFAULT_BREAK_POLICY,
			source: "fallback",
		};
	}

	const signalHints = rawPolicy.signalHints || {};

	const normalizedSignalHints = {
		exitIdentifiers: normalizeIdentifierArray(
			signalHints.exitIdentifiers,
			DEFAULT_SIGNAL_HINTS.exitIdentifiers
		),
		entryIdentifiers: normalizeIdentifierArray(
			signalHints.entryIdentifiers,
			DEFAULT_SIGNAL_HINTS.entryIdentifiers
		),
		ignoredIdentifiers: normalizeIdentifierArray(
			signalHints.ignoredIdentifiers,
			DEFAULT_SIGNAL_HINTS.ignoredIdentifiers
		),
	};

	const exitSet = new Set(normalizedSignalHints.exitIdentifiers);

	normalizedSignalHints.entryIdentifiers =
		normalizedSignalHints.entryIdentifiers.filter(
			(identifier) => !exitSet.has(identifier)
		);

	if (!normalizedSignalHints.entryIdentifiers.length) {
		normalizedSignalHints.entryIdentifiers =
			DEFAULT_SIGNAL_HINTS.entryIdentifiers.filter(
				(identifier) => !exitSet.has(identifier)
			);
	}

	const uniqueRules = new Map();

	for (const rawRule of rawPolicy.breaks || []) {
		const rule = normalizeBreakRule(rawRule);
		if (!rule) continue;
		if (uniqueRules.has(rule.key)) continue;

		uniqueRules.set(rule.key, rule);
	}

	const unclassifiedBreaks = rawPolicy.unclassifiedBreaks || {};

	return {
		version: 1,
		source: "shiftBreakPolicy",
		signalHints: normalizedSignalHints,
		breaks: Array.from(uniqueRules.values()),
		unclassifiedBreaks: {
			deduct: unclassifiedBreaks.deduct === true,
			flagOnly: unclassifiedBreaks.flagOnly !== false,
		},
	};
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

			overtimeMax: shift.overtimeMaximumAllowableLimitInMinutes ?? 0,

			weeklyHalfSet: new Set(
				(shift.weeklyHalfDays || []).map((day) => day.toLowerCase())
			),

			breakPolicy: normalizeBreakPolicy(shift.breakPolicy),
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

function buildConsecutiveClusters(punches, windowMinutes) {
	const clusters = [];

	for (const punch of punches) {
		const lastCluster = clusters.at(-1);

		if (!lastCluster) {
			clusters.push([punch]);
			continue;
		}

		const previousPunch = lastCluster.at(-1);
		const gapMinutes = punch.timestamp.diff(previousPunch.timestamp, "minute");

		if (gapMinutes <= windowMinutes) {
			lastCluster.push(punch);
			continue;
		}

		clusters.push([punch]);
	}

	return clusters.map((punchesInCluster, index) => ({
		index,
		first: punchesInCluster[0],
		last: punchesInCluster.at(-1),
		punches: punchesInCluster,
	}));
}

function buildArrivalBoundaryCluster(punches) {
	let endIndex = 0;

	for (let i = 1; i < punches.length; i++) {
		const gapMinutes = punches[i].timestamp.diff(
			punches[i - 1].timestamp,
			"minute"
		);

		if (gapMinutes > PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES) {
			break;
		}

		endIndex = i;
	}

	const clusterPunches = punches.slice(0, endIndex + 1);

	return {
		index: 0,
		startIndex: 0,
		endIndex,
		first: clusterPunches[0],
		last: clusterPunches.at(-1),
		punches: clusterPunches,
	};
}

function buildExitBoundaryCluster(punches, minimumStartIndex) {
	let startIndex = punches.length - 1;

	for (let i = punches.length - 2; i >= minimumStartIndex; i--) {
		const gapMinutes = punches[i + 1].timestamp.diff(
			punches[i].timestamp,
			"minute"
		);

		if (gapMinutes > PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES) {
			break;
		}

		startIndex = i;
	}

	const clusterPunches = punches.slice(startIndex);

	return {
		index: 0,
		startIndex,
		endIndex: punches.length - 1,
		first: clusterPunches[0],
		last: clusterPunches.at(-1),
		punches: clusterPunches,
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

function serializeCluster(
	cluster,
	{ role = "unknown", chosenBoundary = null, selectionRule = null, sideHint = null } = {}
) {
	return {
		role,
		sideHint,
		punchCount: cluster.punches.length,
		firstPunchUtc: cluster.first.timestamp.utc().toISOString(),
		firstPunchLocal: cluster.first.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		lastPunchUtc: cluster.last.timestamp.utc().toISOString(),
		lastPunchLocal: cluster.last.timestamp.format("YYYY-MM-DD HH:mm:ss"),
		chosenBoundaryUtc: chosenBoundary ? chosenBoundary.utc().toISOString() : null,
		chosenBoundaryLocal: chosenBoundary
			? chosenBoundary.format("YYYY-MM-DD HH:mm:ss")
			: null,
		selectionRule,
		punches: cluster.punches.map(serializePunch),
	};
}

function identifierSetFromCluster(cluster) {
	const identifiers = new Set();

	for (const punch of cluster.punches) {
		for (const identifier of punch.identifiers || []) {
			identifiers.add(identifier);
		}
	}

	return identifiers;
}

function getClusterSideHint(cluster, breakPolicy) {
	const identifiers = identifierSetFromCluster(cluster);

	const exitSet = new Set(breakPolicy.signalHints.exitIdentifiers);
	const entrySet = new Set(breakPolicy.signalHints.entryIdentifiers);
	const ignoredSet = new Set(breakPolicy.signalHints.ignoredIdentifiers);

	let hasExit = false;
	let hasEntry = false;
	let hasNonIgnoredUnknown = false;

	for (const identifier of identifiers) {
		if (exitSet.has(identifier)) {
			hasExit = true;
			continue;
		}

		if (entrySet.has(identifier)) {
			hasEntry = true;
			continue;
		}

		if (!ignoredSet.has(identifier)) {
			hasNonIgnoredUnknown = true;
		}
	}

	if (hasExit && !hasEntry) return "exitLike";
	if (hasEntry && !hasExit) return "entryLike";
	if (hasExit && hasEntry) return "mixed";
	if (hasNonIgnoredUnknown) return "ambiguous";

	return "ignored";
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

function parseHHmm(value) {
	const [hour, minute] = value.split(":").map(Number);
	return {
		hour,
		minute,
	};
}

function makeWindowAroundDay(baseDay, windowStart, windowEnd) {
	const startParts = parseHHmm(windowStart);
	const endParts = parseHHmm(windowEnd);

	const start = baseDay
		.hour(startParts.hour)
		.minute(startParts.minute)
		.second(0)
		.millisecond(0);

	let end = baseDay
		.hour(endParts.hour)
		.minute(endParts.minute)
		.second(0)
		.millisecond(0);

	if (!end.isAfter(start)) {
		end = end.add(1, "day");
	}

	return {
		start,
		end,
	};
}

function minutesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
	const start = Math.max(leftStart.valueOf(), rightStart.valueOf());
	const end = Math.min(leftEnd.valueOf(), rightEnd.valueOf());

	if (end <= start) return 0;

	return Math.floor((end - start) / 60000);
}

function candidateOverlapsTimeWindow(candidate, rule, day) {
	for (const offset of [-1, 0, 1]) {
		const window = makeWindowAroundDay(
			day.add(offset, "day"),
			rule.windowStart,
			rule.windowEnd
		);

		const overlap = minutesOverlap(
			candidate.from,
			candidate.to,
			window.start,
			window.end
		);

		if (overlap > 0) return true;
	}

	return false;
}

function ruleOccurrenceLimitReached(rule, ruleState) {
	if (!rule.maxOccurrences) return false;

	const used = ruleState.occurrences.get(rule.key) || 0;
	return used >= rule.maxOccurrences;
}

function incrementRuleOccurrence(rule, ruleState) {
	ruleState.occurrences.set(
		rule.key,
		(ruleState.occurrences.get(rule.key) || 0) + 1
	);
}

function getFloatingRuleRemaining(rule, ruleState) {
	return Math.max(0, rule.maxTotalMinutes - (ruleState.minutes.get(rule.key) || 0));
}

function consumeFloatingRule(rule, minutes, ruleState) {
	ruleState.minutes.set(
		rule.key,
		(ruleState.minutes.get(rule.key) || 0) + minutes
	);
}

function classifyBreakCandidate({
	candidate,
	breakPolicy,
	day,
	ruleState,
	directionIsFact,
}) {
	const timeBoundRules = breakPolicy.breaks.filter(
		(rule) => rule.kind === "timeBound"
	);

	const freeDurationRules = breakPolicy.breaks.filter(
		(rule) => rule.kind === "freeDuration"
	);

	const floatingRules = breakPolicy.breaks.filter(
		(rule) => rule.kind === "floatingAllowance"
	);

	for (const rule of timeBoundRules) {
		if (ruleOccurrenceLimitReached(rule, ruleState)) continue;
		if (candidate.minutes < rule.minMinutes) continue;
		if (candidate.minutes > rule.maxMinutes) continue;
		if (!candidateOverlapsTimeWindow(candidate, rule, day)) continue;

		incrementRuleOccurrence(rule, ruleState);

		return {
			classification: "classified",
			breakKey: rule.key,
			breakLabel: rule.label,
			breakKind: rule.kind,
			policyCountedMinutes: rule.deduct ? candidate.minutes : 0,
			exceededPolicyMinutes: 0,
			countsTowardInsideEstimate: directionIsFact ? true : rule.deduct,
			reason: "matchedTimeBoundBreakPolicy",
		};
	}

	for (const rule of freeDurationRules) {
		if (ruleOccurrenceLimitReached(rule, ruleState)) continue;
		if (candidate.minutes < rule.minMinutes) continue;
		if (candidate.minutes > rule.maxMinutes) continue;

		incrementRuleOccurrence(rule, ruleState);

		return {
			classification: "classified",
			breakKey: rule.key,
			breakLabel: rule.label,
			breakKind: rule.kind,
			policyCountedMinutes: rule.deduct ? candidate.minutes : 0,
			exceededPolicyMinutes: 0,
			countsTowardInsideEstimate: directionIsFact ? true : rule.deduct,
			reason: "matchedFreeDurationBreakPolicy",
		};
	}

	for (const rule of floatingRules) {
		if (candidate.minutes < rule.minSegmentMinutes) continue;

		const remaining = getFloatingRuleRemaining(rule, ruleState);
		if (remaining <= 0) continue;

		const policyCountedMinutes = Math.min(candidate.minutes, remaining);
		const exceededPolicyMinutes = Math.max(
			0,
			candidate.minutes - policyCountedMinutes
		);

		consumeFloatingRule(rule, policyCountedMinutes, ruleState);

		return {
			classification: "classified",
			breakKey: rule.key,
			breakLabel: rule.label,
			breakKind: rule.kind,
			policyCountedMinutes: rule.deduct ? policyCountedMinutes : 0,
			exceededPolicyMinutes,
			countsTowardInsideEstimate: directionIsFact ? true : rule.deduct,
			reason:
				exceededPolicyMinutes > 0
					? "matchedFloatingAllowanceButExceededRemainingAllowance"
					: "matchedFloatingAllowance",
		};
	}

	if (
		!directionIsFact &&
		breakPolicy.unclassifiedBreaks.deduct &&
		candidate.minutes >= PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES &&
		candidate.minutes <= PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES
	) {
		return {
			classification: "unclassified",
			breakKey: "unclassified",
			breakLabel: "Unclassified Break",
			breakKind: "unclassified",
			policyCountedMinutes: candidate.minutes,
			exceededPolicyMinutes: 0,
			countsTowardInsideEstimate: true,
			reason: "deductedByUnclassifiedFallbackBounds",
		};
	}

	return {
		classification: "unclassified",
		breakKey: null,
		breakLabel: null,
		breakKind: null,
		policyCountedMinutes: 0,
		exceededPolicyMinutes: 0,
		countsTowardInsideEstimate: directionIsFact,
		reason: directionIsFact
			? "directionalOutsideIntervalDidNotMatchBreakPolicy"
			: "didNotMatchBreakPolicy",
	};
}

function serializeBreakCandidate(candidate) {
	return {
		fromUtc: candidate.from.utc().toISOString(),
		fromLocal: candidate.from.format("YYYY-MM-DD HH:mm:ss"),
		toUtc: candidate.to.utc().toISOString(),
		toLocal: candidate.to.format("YYYY-MM-DD HH:mm:ss"),
		minutes: candidate.minutes,
		source: candidate.source,
		exitPunch: candidate.exitPunch ? serializePunch(candidate.exitPunch) : null,
		entryPunch: candidate.entryPunch ? serializePunch(candidate.entryPunch) : null,
		exitCluster: candidate.exitCluster
			? serializeCluster(candidate.exitCluster, {
					role: "candidateBreakExit",
					sideHint: candidate.exitSideHint,
				})
			: null,
		entryCluster: candidate.entryCluster
			? serializeCluster(candidate.entryCluster, {
					role: "candidateBreakReentry",
					sideHint: candidate.entrySideHint,
				})
			: null,
	};
}

function buildOutsideInterval(candidate, classification) {
	return {
		fromUtc: candidate.from.utc().toISOString(),
		fromLocal: candidate.from.format("YYYY-MM-DD HH:mm:ss"),
		toUtc: candidate.to.utc().toISOString(),
		toLocal: candidate.to.format("YYYY-MM-DD HH:mm:ss"),
		minutes: candidate.minutes,

		breakKey: classification.breakKey,
		breakLabel: classification.breakLabel,
		breakKind: classification.breakKind,
		classification: classification.classification,

		policyCountedMinutes: classification.policyCountedMinutes,
		exceededPolicyMinutes: classification.exceededPolicyMinutes,
		countsTowardInsideEstimate: classification.countsTowardInsideEstimate,

		source: candidate.source,
		reason: classification.reason,
		selectionRule:
			candidate.source === "directionalPunchState"
				? "out punchState followed by in punchState"
				: "exit-like cluster followed by entry-like cluster and classified by shift breakPolicy",
	};
}

function buildInputHash({ item, shiftId, punches, breakPolicy, mode }) {
	const payload = {
		algorithmVersion: ALGORITHM_VERSION,
		timezone: TIMEZONE,
		mode,
		boundaryClusterWindowMinutes:
			PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
		breakClusterWindowMinutes:
			PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
		meaningfulOutsideGapMinutes:
			PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
		maxUnclassifiedOutsideGapMinutes:
			PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES,
		breakPolicy,
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
			regularShiftEnd: null,
			overtimeMaxMinutes: 0,
			breakPolicy: {
				...DEFAULT_BREAK_POLICY,
				source: "fallback",
			},
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

	const regularShiftEnd = windowEnd.clone();

	const postShiftLookaheadMinutes = Math.max(
		shift.postTol || 0,
		shift.overtimeMax || 0
	);

	windowEnd = windowEnd.add(postShiftLookaheadMinutes, "minute");

	return {
		shiftId,
		usedShiftWindow: true,
		regularShiftEnd,
		overtimeMaxMinutes: shift.overtimeMax || 0,
		breakPolicy: shift.breakPolicy,
		punches: allEmployeePunches.filter((punch) =>
			punch.timestamp.isBetween(windowStart, windowEnd, null, "[]")
		),
	};
}

function buildClustersPayload({
	mode,
	directionCoverage,
	breakPolicy,
	arrival = null,
	exit = null,
	middle = [],
	insideSessions = [],
	candidateBreaks = [],
	outsideIntervals = [],
	ignoredPostShiftMiddlePunches = [],
	notes = [],
}) {
	return {
		mode,
		directionCoverage,

		boundaryClusterWindowMinutes:
			PRESENCE_ESTIMATE_BOUNDARY_CLUSTER_WINDOW_MINUTES,
		breakClusterWindowMinutes: PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES,
		meaningfulOutsideGapMinutes:
			PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES,
		maxUnclassifiedOutsideGapMinutes:
			PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES,

		breakPolicySource: breakPolicy?.source || "unknown",
		signalHints: breakPolicy?.signalHints || DEFAULT_SIGNAL_HINTS,
		configuredBreaks: breakPolicy?.breaks || [],

		arrival,
		exit,
		middle,
		insideSessions,
		candidateBreaks,
		outsideIntervals,
		ignoredPostShiftMiddlePunches,
		notes,
	};
}

function getEstimateConfidence({ mode, flags }) {
	if (flags.includes("noPunches")) return "unknown";
	if (flags.includes("invalidEstimatedWindow")) return "low";
	if (flags.includes("singlePunchOnly")) return "low";

	if (mode === "directional") {
		if (
			flags.includes("missingInitialInEstimated") ||
			flags.includes("missingFinalOutEstimated") ||
			flags.includes("directionalSequenceAnomaly")
		) {
			return "medium";
		}

		return "high";
	}

	if (mode === "hybrid") return "medium";

	return "low";
}

function buildDirectionalEstimate({
	item,
	punches,
	regularShiftEnd,
	overtimeMaxMinutes,
	breakPolicy,
	flags,
	mode,
	directionCoverage,
	shiftId,
}) {
	const directionalPunches = punches.filter(
		(punch) => punch.punchState === "in" || punch.punchState === "out"
	);

	const ruleState = {
		occurrences: new Map(),
		minutes: new Map(),
	};

	const insideSessions = [];
	const candidateBreaks = [];
	const outsideIntervals = [];

	let firstInPunch = directionalPunches.find((punch) => punch.punchState === "in");
	let lastOutPunch = null;

	for (let i = directionalPunches.length - 1; i >= 0; i -= 1) {
		if (directionalPunches[i].punchState === "out") {
			lastOutPunch = directionalPunches[i];
			break;
		}
	}

	let currentInsideStart = null;
	let pendingOutsideStartPunch = null;

	for (const punch of directionalPunches) {
		if (punch.punchState === "in") {
			if (pendingOutsideStartPunch) {
				const outsideStart = pendingOutsideStartPunch.timestamp;
				const outsideEnd = punch.timestamp;
				const outsideMinutes = outsideEnd.diff(outsideStart, "minute");

				const candidate = {
					from: outsideStart,
					to: outsideEnd,
					minutes: outsideMinutes,
					source: "directionalPunchState",
					exitPunch: pendingOutsideStartPunch,
					entryPunch: punch,
				};

				pendingOutsideStartPunch = null;

				if (outsideMinutes > 0) {
					const classification = classifyBreakCandidate({
						candidate,
						breakPolicy,
						day: item.day,
						ruleState,
						directionIsFact: true,
					});

					candidateBreaks.push({
						...serializeBreakCandidate(candidate),
						...classification,
					});

					outsideIntervals.push(buildOutsideInterval(candidate, classification));

					if (classification.classification === "classified") {
						flags.push("directionalBreakClassified");
					} else {
						flags.push("directionalOutsideIntervalUnclassified");
					}

					if (classification.exceededPolicyMinutes > 0) {
						flags.push("breakPolicyAllowanceExceeded");
					}
				}

				if (!currentInsideStart) {
					currentInsideStart = punch;
				}

				continue;
			}

			if (currentInsideStart) {
				flags.push("consecutiveInPunchIgnored");
				continue;
			}

			currentInsideStart = punch;
			continue;
		}

		if (punch.punchState === "out") {
			if (!currentInsideStart) {
				flags.push("outPunchWithoutPriorIn");
				flags.push("directionalSequenceAnomaly");
				pendingOutsideStartPunch = punch;
				continue;
			}

			if (punch.timestamp.isAfter(currentInsideStart.timestamp)) {
				insideSessions.push({
					fromUtc: currentInsideStart.timestamp.utc().toISOString(),
					fromLocal: currentInsideStart.timestamp.format("YYYY-MM-DD HH:mm:ss"),
					toUtc: punch.timestamp.utc().toISOString(),
					toLocal: punch.timestamp.format("YYYY-MM-DD HH:mm:ss"),
					minutes: punch.timestamp.diff(currentInsideStart.timestamp, "minute"),
					source: "directionalPunchState",
				});
			}

			currentInsideStart = null;
			pendingOutsideStartPunch = punch;
		}
	}

	if (currentInsideStart) {
		flags.push("openInsideSessionAtEnd");
	}

	if (pendingOutsideStartPunch && pendingOutsideStartPunch === lastOutPunch) {
		flags.push("finalOutHasNoReentry");
	}

	let estimatedInsideStart = firstInPunch?.timestamp || null;
	let estimatedInsideEnd = lastOutPunch?.timestamp || null;

	if (!estimatedInsideStart) {
		flags.push("missingInitialInEstimated");
		estimatedInsideStart = punches[0]?.timestamp || null;
	}

	if (!estimatedInsideEnd) {
		flags.push("missingFinalOutEstimated");

		if (regularShiftEnd) {
			estimatedInsideEnd = regularShiftEnd;
		} else {
			estimatedInsideEnd = punches.at(-1)?.timestamp || null;
		}
	}

	if (
		estimatedInsideEnd &&
		regularShiftEnd &&
		overtimeMaxMinutes > 0 &&
		estimatedInsideEnd.isAfter(regularShiftEnd)
	) {
		const overtimeLimitEnd = regularShiftEnd.add(overtimeMaxMinutes, "minute");

		if (estimatedInsideEnd.valueOf() <= overtimeLimitEnd.valueOf()) {
			flags.push("estimatedEndExtendedByValidOvertimePunch");
		} else {
			flags.push("postShiftPunchBeyondOvertimeLimit");
		}
	}

	if (!estimatedInsideStart || !estimatedInsideEnd) {
		flags.push("invalidEstimatedWindow");
	}

	const grossInsideMinutes =
		estimatedInsideStart && estimatedInsideEnd
			? estimatedInsideEnd.diff(estimatedInsideStart, "minute")
			: 0;

	if (grossInsideMinutes <= 0) {
		flags.push("invalidEstimatedWindow");
	}

	const estimatedOutsideMinutes = outsideIntervals.reduce(
		(total, interval) =>
			interval.countsTowardInsideEstimate ? total + interval.minutes : total,
		0
	);

	const estimatedInsideMinutes =
		grossInsideMinutes > 0
			? Math.max(0, grossInsideMinutes - estimatedOutsideMinutes)
			: null;

	const uniqueFlags = Array.from(new Set(flags));

	return {
		employeeId: item.employeeId,
		attendanceDate: toAttendanceDate(item.day),

		firstRawPunch: punches[0]?.timestamp.utc().toDate() || null,
		lastRawPunch: punches.at(-1)?.timestamp.utc().toDate() || null,

		estimatedInsideStart: estimatedInsideStart
			? estimatedInsideStart.utc().toDate()
			: null,
		estimatedInsideEnd: estimatedInsideEnd ? estimatedInsideEnd.utc().toDate() : null,
		estimatedInsideMinutes,

		confidence: getEstimateConfidence({
			mode,
			flags: uniqueFlags,
		}),
		flags: uniqueFlags,
		clusters: buildClustersPayload({
			mode,
			directionCoverage,
			breakPolicy,
			insideSessions,
			candidateBreaks,
			outsideIntervals,
			notes: [
				"directional mode uses BiometricLog.punchState as the primary source of truth",
				"out punch followed by in punch creates a high-confidence outside interval",
				"breakPolicy classifies outside intervals but does not invent direction",
				"boundary estimation is used only when required punchState boundaries are missing",
			],
		}),

		algorithmVersion: ALGORITHM_VERSION,
		inputHash: buildInputHash({
			item,
			shiftId,
			punches,
			breakPolicy,
			mode,
		}),
		computedAt: new Date(),
	};
}

function pairAndClassifyUndirectedMiddleBreaks({
	middleClusters,
	breakPolicy,
	day,
	flags,
}) {
	const pairedCandidates = [];
	const outsideIntervals = [];

	const ruleState = {
		occurrences: new Map(),
		minutes: new Map(),
	};

	let openExitCluster = null;

	for (const cluster of middleClusters) {
		const sideHint = getClusterSideHint(cluster, breakPolicy);
		cluster.sideHint = sideHint;

		if (sideHint === "ignored") {
			flags.push("ignoredMiddleClusterWithoutSideEvidence");
			continue;
		}

		if (sideHint === "mixed" || sideHint === "ambiguous") {
			flags.push("ambiguousMiddleClusterIgnored");
			continue;
		}

		if (sideHint === "exitLike") {
			if (openExitCluster) {
				flags.push("consecutiveExitLikeClusterReplaced");
			}

			openExitCluster = cluster;
			continue;
		}

		if (sideHint === "entryLike") {
			if (!openExitCluster) {
				flags.push("entryLikeClusterWithoutPriorExitIgnored");
				continue;
			}

			const possibleOutsideStart = openExitCluster.last.timestamp;
			const possibleOutsideEnd = cluster.last.timestamp;
			const possibleOutsideMinutes = possibleOutsideEnd.diff(
				possibleOutsideStart,
				"minute"
			);

			const candidate = {
				from: possibleOutsideStart,
				to: possibleOutsideEnd,
				minutes: possibleOutsideMinutes,
				source: "identifierSideHint",
				exitCluster: openExitCluster,
				entryCluster: cluster,
				exitSideHint: openExitCluster.sideHint,
				entrySideHint: cluster.sideHint,
			};

			openExitCluster = null;

			if (possibleOutsideMinutes <= 0) {
				flags.push("invalidBreakCandidateIgnored");
				continue;
			}

			const classification = classifyBreakCandidate({
				candidate,
				breakPolicy,
				day,
				ruleState,
				directionIsFact: false,
			});

			pairedCandidates.push({
				...serializeBreakCandidate(candidate),
				...classification,
			});

			if (!classification.countsTowardInsideEstimate) {
				flags.push(
					classification.classification === "classified"
						? "classifiedBreakNotDeducted"
						: "unclassifiedBreakCandidateIgnored"
				);
				continue;
			}

			outsideIntervals.push(buildOutsideInterval(candidate, classification));
			flags.push("estimatedOutsideIntervalDeducted");
		}
	}

	if (openExitCluster) {
		flags.push("unpairedExitLikeMiddleCluster");
	}

	return {
		pairedCandidates,
		outsideIntervals,
		middleClusters,
	};
}

function buildUndirectedEstimate({
	item,
	punches,
	regularShiftEnd,
	overtimeMaxMinutes,
	breakPolicy,
	flags,
	mode,
	directionCoverage,
	shiftId,
}) {
	if (breakPolicy.source === "shiftBreakPolicy") {
		flags.push("breakPolicyApplied");
	} else {
		flags.push("fallbackBreakPolicyUsed");
	}

	if (punches.length === 1) {
		flags.push("singlePunchOnly");

		const singleCluster = {
			index: 0,
			first: punches[0],
			last: punches[0],
			punches,
		};

		return {
			employeeId: item.employeeId,
			attendanceDate: toAttendanceDate(item.day),

			firstRawPunch: punches[0].timestamp.utc().toDate(),
			lastRawPunch: punches[0].timestamp.utc().toDate(),

			estimatedInsideStart: punches[0].timestamp.utc().toDate(),
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "low",
			flags: Array.from(new Set(flags)),
			clusters: buildClustersPayload({
				mode,
				directionCoverage,
				breakPolicy,
				arrival: serializeCluster(singleCluster, {
					role: "singlePunch",
					chosenBoundary: punches[0].timestamp,
					selectionRule: "single punch only; cannot infer exit",
					sideHint: getClusterSideHint(singleCluster, breakPolicy),
				}),
				notes: ["single punch cannot produce inside-duration estimate"],
			}),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				punches,
				breakPolicy,
				mode,
			}),
			computedAt: new Date(),
		};
	}

	const arrivalCluster = buildArrivalBoundaryCluster(punches);

	if (arrivalCluster.punches.length > 1) {
		flags.push("multipleArrivalPunches", "arrivalBoundaryAdjusted");
	}

	if (arrivalCluster.endIndex >= punches.length - 1) {
		flags.push("singleBoundaryClusterOnly");

		return {
			employeeId: item.employeeId,
			attendanceDate: toAttendanceDate(item.day),

			firstRawPunch: punches[0].timestamp.utc().toDate(),
			lastRawPunch: punches.at(-1).timestamp.utc().toDate(),

			estimatedInsideStart: arrivalCluster.last.timestamp.utc().toDate(),
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "low",
			flags: Array.from(new Set(flags)),
			clusters: buildClustersPayload({
				mode,
				directionCoverage,
				breakPolicy,
				arrival: serializeCluster(arrivalCluster, {
					role: "arrivalBoundary",
					chosenBoundary: arrivalCluster.last.timestamp,
					selectionRule:
						"latest punch in arrival boundary cluster is estimated inside start",
					sideHint: getClusterSideHint(arrivalCluster, breakPolicy),
				}),
				notes: [
					"all punches were absorbed into the arrival boundary cluster",
					"this can estimate inside start but cannot estimate inside end",
				],
			}),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				punches,
				breakPolicy,
				mode,
			}),
			computedAt: new Date(),
		};
	}

	const exitCluster = buildExitBoundaryCluster(
		punches,
		arrivalCluster.endIndex + 1
	);

	if (exitCluster.punches.length > 1) {
		flags.push("multipleExitPunches", "exitBoundaryAdjusted");
	}

	const rawMiddlePunches = punches.slice(
		arrivalCluster.endIndex + 1,
		exitCluster.startIndex
	);

	const finalPunch = exitCluster.last.timestamp;

	const overtimeLimitEnd =
		regularShiftEnd && overtimeMaxMinutes > 0
			? regularShiftEnd.add(overtimeMaxMinutes, "minute")
			: null;

	const finalPunchIsValidOvertime =
		regularShiftEnd &&
		overtimeLimitEnd &&
		finalPunch.isAfter(regularShiftEnd) &&
		finalPunch.valueOf() <= overtimeLimitEnd.valueOf();

	const estimatedInsideStart = arrivalCluster.last.timestamp;

	const estimatedInsideEnd = regularShiftEnd
		? finalPunchIsValidOvertime
			? finalPunch
			: regularShiftEnd
		: finalPunch;

	if (regularShiftEnd && finalPunch.isBefore(regularShiftEnd)) {
		flags.push("estimatedEndAnchoredToScheduledEnd");
	}

	if (finalPunchIsValidOvertime) {
		flags.push("estimatedEndExtendedByValidOvertimePunch");
	}

	if (
		regularShiftEnd &&
		finalPunch.isAfter(regularShiftEnd) &&
		!finalPunchIsValidOvertime
	) {
		flags.push("postShiftPunchIgnoredBeyondOvertimeLimit");
	}

	const middlePunches = regularShiftEnd
		? rawMiddlePunches.filter((punch) => punch.timestamp.isBefore(regularShiftEnd))
		: rawMiddlePunches;

	const ignoredPostShiftMiddlePunches = regularShiftEnd
		? rawMiddlePunches.filter(
				(punch) => !punch.timestamp.isBefore(regularShiftEnd)
			)
		: [];

	if (ignoredPostShiftMiddlePunches.length) {
		flags.push("postShiftMiddlePunchesIgnoredForBreakInference");
	}

	const middleClusters = buildConsecutiveClusters(
		middlePunches,
		PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES
	);

	const {
		pairedCandidates,
		outsideIntervals,
		middleClusters: classifiedMiddleClusters,
	} = pairAndClassifyUndirectedMiddleBreaks({
		middleClusters,
		breakPolicy,
		day: item.day,
		flags,
	});

	const grossInsideMinutes = estimatedInsideEnd.diff(
		estimatedInsideStart,
		"minute"
	);

	if (grossInsideMinutes <= 0) {
		flags.push("invalidEstimatedWindow");
	}

	const deductedOutsideMinutes = outsideIntervals.reduce(
		(total, interval) =>
			interval.countsTowardInsideEstimate ? total + interval.minutes : total,
		0
	);

	const estimatedInsideMinutes =
		grossInsideMinutes > 0
			? Math.max(0, grossInsideMinutes - deductedOutsideMinutes)
			: null;

	const uniqueFlags = Array.from(new Set(flags));

	return {
		employeeId: item.employeeId,
		attendanceDate: toAttendanceDate(item.day),

		firstRawPunch: punches[0].timestamp.utc().toDate(),
		lastRawPunch: punches.at(-1).timestamp.utc().toDate(),

		estimatedInsideStart: estimatedInsideStart.utc().toDate(),
		estimatedInsideEnd: estimatedInsideEnd.utc().toDate(),
		estimatedInsideMinutes,

		confidence: getEstimateConfidence({
			mode,
			flags: uniqueFlags,
		}),
		flags: uniqueFlags,
		clusters: buildClustersPayload({
			mode,
			directionCoverage,
			breakPolicy,
			arrival: serializeCluster(arrivalCluster, {
				role: "arrivalBoundary",
				chosenBoundary: arrivalCluster.last.timestamp,
				selectionRule:
					"latest punch in arrival boundary cluster is estimated inside start",
				sideHint: getClusterSideHint(arrivalCluster, breakPolicy),
			}),
			exit: serializeCluster(exitCluster, {
				role: "exitBoundary",
				chosenBoundary: estimatedInsideEnd,
				selectionRule:
					"scheduled end is used by default; valid overtime final punch extends estimated inside end",
				sideHint: getClusterSideHint(exitCluster, breakPolicy),
			}),
			middle: classifiedMiddleClusters.map((cluster, index) =>
				serializeCluster(cluster, {
					role: "middle",
					sideHint:
						cluster.sideHint || getClusterSideHint(cluster, breakPolicy),
					selectionRule: `middle cluster ${index + 1}`,
				})
			),
			candidateBreaks: pairedCandidates,
			outsideIntervals,
			ignoredPostShiftMiddlePunches:
				ignoredPostShiftMiddlePunches.map(serializePunch),
			notes: [
				"undirected mode has no usable punchState direction facts",
				"arrival/final boundary estimation is used only in undirected fallback",
				"middle clusters are paired only by identifier side hints",
				"candidate breaks are deducted only when classified by breakPolicy or explicit unclassified fallback",
			],
		}),

		algorithmVersion: ALGORITHM_VERSION,
		inputHash: buildInputHash({
			item,
			shiftId,
			punches,
			breakPolicy,
			mode,
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
	const flags = [];

	const {
		shiftId,
		usedShiftWindow,
		regularShiftEnd,
		overtimeMaxMinutes,
		breakPolicy,
		punches,
	} = resolveWindowedPunches({
		item,
		employeeShiftMap,
		shiftDataMap,
		employeeLogicalPunchMap,
	});

	if (!usedShiftWindow) {
		flags.push("noAssignedShift", "calendarDayWindowUsed");
	}

	if (!punches.length) {
		const directionCoverage = {
			mode: "none",
			directionalCount: 0,
			unknownCount: 0,
			conflictCount: 0,
		};

		flags.push("noPunches");

		return {
			employeeId: item.employeeId,
			attendanceDate: toAttendanceDate(item.day),

			firstRawPunch: null,
			lastRawPunch: null,

			estimatedInsideStart: null,
			estimatedInsideEnd: null,
			estimatedInsideMinutes: null,

			confidence: "unknown",
			flags: Array.from(new Set(flags)),
			clusters: buildClustersPayload({
				mode: "none",
				directionCoverage,
				breakPolicy,
				notes: ["no raw punches found inside the estimate window"],
			}),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				punches,
				breakPolicy,
				mode: "none",
			}),
			computedAt: new Date(),
		};
	}

	const directionCoverage = classifyPunchStateCoverage(punches);
	const mode = directionCoverage.mode;

	if (mode === "directional") {
		flags.push("directionalPunchStateMode");

		return buildDirectionalEstimate({
			item,
			punches,
			regularShiftEnd,
			overtimeMaxMinutes,
			breakPolicy,
			flags,
			mode,
			directionCoverage,
			shiftId,
		});
	}

	if (mode === "hybrid") {
		flags.push("hybridPunchStateMode");

		if (directionCoverage.unknownCount) {
			flags.push("somePunchStatesMissing");
		}

		if (directionCoverage.conflictCount) {
			flags.push("conflictingPunchStatesCollapsed");
		}

		return buildDirectionalEstimate({
			item,
			punches,
			regularShiftEnd,
			overtimeMaxMinutes,
			breakPolicy,
			flags,
			mode,
			directionCoverage,
			shiftId,
		});
	}

	flags.push("undirectedFallbackMode");

	return buildUndirectedEstimate({
		item,
		punches,
		regularShiftEnd,
		overtimeMaxMinutes,
		breakPolicy,
		flags,
		mode,
		directionCoverage,
		shiftId,
	});
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

	const records = normalizedEmployeeDays.map((item) =>
		computePresenceEstimateRecord({
			item,
			employeeShiftMap,
			shiftDataMap,
			employeeLogicalPunchMap,
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