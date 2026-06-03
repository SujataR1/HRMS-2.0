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

const ALGORITHM_VERSION = 4;

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

const PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES = readPositiveIntEnv(
	"PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES",
	90,
	{ min: 1, max: 480 }
);

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
	if (!["timeBound", "freeDuration"].includes(kind)) return null;

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
	{ role = "unknown", chosenBoundary = null, selectionRule = null, sideHint = null } = {}
) {
	return {
		role,
		sideHint,
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

function identifierSetFromCluster(cluster) {
	return new Set(cluster.logs.map((log) => log.identifier));
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

function ruleOccurrenceLimitReached(rule, ruleUseCount) {
	if (!rule.maxOccurrences) return false;

	return (ruleUseCount.get(rule.key) || 0) >= rule.maxOccurrences;
}

function incrementRuleUse(rule, ruleUseCount) {
	ruleUseCount.set(rule.key, (ruleUseCount.get(rule.key) || 0) + 1);
}

function classifyBreakCandidate({ candidate, breakPolicy, day, ruleUseCount }) {
	const timeBoundRules = breakPolicy.breaks.filter(
		(rule) => rule.kind === "timeBound"
	);

	const freeDurationRules = breakPolicy.breaks.filter(
		(rule) => rule.kind === "freeDuration"
	);

	for (const rule of timeBoundRules) {
		if (ruleOccurrenceLimitReached(rule, ruleUseCount)) continue;
		if (candidate.minutes < rule.minMinutes) continue;
		if (candidate.minutes > rule.maxMinutes) continue;
		if (!candidateOverlapsTimeWindow(candidate, rule, day)) continue;

		incrementRuleUse(rule, ruleUseCount);

		return {
			classification: "classified",
			breakKey: rule.key,
			breakLabel: rule.label,
			breakKind: rule.kind,
			deducted: rule.deduct,
			reason: "matchedTimeBoundBreakPolicy",
		};
	}

	for (const rule of freeDurationRules) {
		if (ruleOccurrenceLimitReached(rule, ruleUseCount)) continue;
		if (candidate.minutes < rule.minMinutes) continue;
		if (candidate.minutes > rule.maxMinutes) continue;

		incrementRuleUse(rule, ruleUseCount);

		return {
			classification: "classified",
			breakKey: rule.key,
			breakLabel: rule.label,
			breakKind: rule.kind,
			deducted: rule.deduct,
			reason: "matchedFreeDurationBreakPolicy",
		};
	}

	if (
		breakPolicy.unclassifiedBreaks.deduct &&
		candidate.minutes >= PRESENCE_ESTIMATE_MEANINGFUL_OUTSIDE_GAP_MINUTES &&
		candidate.minutes <= PRESENCE_ESTIMATE_MAX_UNCLASSIFIED_OUTSIDE_GAP_MINUTES
	) {
		return {
			classification: "unclassified",
			breakKey: "unclassified",
			breakLabel: "Unclassified Break",
			breakKind: "unclassified",
			deducted: true,
			reason: "deductedByUnclassifiedFallbackBounds",
		};
	}

	return {
		classification: "unclassified",
		breakKey: null,
		breakLabel: null,
		breakKind: null,
		deducted: false,
		reason: "didNotMatchBreakPolicy",
	};
}

function pairAndClassifyMiddleBreaks({ middleClusters, breakPolicy, day, flags }) {
	const pairedCandidates = [];
	const outsideIntervals = [];
	const ruleUseCount = new Map();

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

			const candidateBase = {
				from: possibleOutsideStart,
				to: possibleOutsideEnd,
				minutes: possibleOutsideMinutes,
				exitCluster: openExitCluster,
				entryCluster: cluster,
				exitSideHint: openExitCluster.sideHint,
				entrySideHint: cluster.sideHint,
			};

			openExitCluster = null;

			if (possibleOutsideMinutes <= 0) {
				flags.push("invalidBreakCandidateIgnored");
				pairedCandidates.push({
					...serializeBreakCandidate(candidateBase),
					classification: "invalid",
					deducted: false,
					reason: "candidateEndIsNotAfterCandidateStart",
				});
				continue;
			}

			const classification = classifyBreakCandidate({
				candidate: candidateBase,
				breakPolicy,
				day,
				ruleUseCount,
			});

			const serializedCandidate = {
				...serializeBreakCandidate(candidateBase),
				...classification,
			};

			pairedCandidates.push(serializedCandidate);

			if (!classification.deducted) {
				flags.push(
					classification.classification === "classified"
						? "classifiedBreakNotDeducted"
						: "unclassifiedBreakCandidateIgnored"
				);
				continue;
			}

			outsideIntervals.push({
				fromUtc: possibleOutsideStart.utc().toISOString(),
				fromLocal: possibleOutsideStart.format("YYYY-MM-DD HH:mm:ss"),
				toUtc: possibleOutsideEnd.utc().toISOString(),
				toLocal: possibleOutsideEnd.format("YYYY-MM-DD HH:mm:ss"),
				minutes: possibleOutsideMinutes,
				breakKey: classification.breakKey,
				breakLabel: classification.breakLabel,
				breakKind: classification.breakKind,
				classification: classification.classification,
				reason: classification.reason,
				selectionRule:
					"exit-like cluster followed by entry-like cluster and classified by shift breakPolicy",
			});

			flags.push("classifiedOutsideIntervalDeducted");
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

function serializeBreakCandidate(candidate) {
	return {
		fromUtc: candidate.from.utc().toISOString(),
		fromLocal: candidate.from.format("YYYY-MM-DD HH:mm:ss"),
		toUtc: candidate.to.utc().toISOString(),
		toLocal: candidate.to.format("YYYY-MM-DD HH:mm:ss"),
		minutes: candidate.minutes,
		exitSideHint: candidate.exitSideHint,
		entrySideHint: candidate.entrySideHint,
		exitCluster: serializeCluster(candidate.exitCluster, {
			role: "candidateBreakExit",
			sideHint: candidate.exitSideHint,
		}),
		entryCluster: serializeCluster(candidate.entryCluster, {
			role: "candidateBreakReentry",
			sideHint: candidate.entrySideHint,
		}),
	};
}

function buildInputHash({ item, shiftId, logs, breakPolicy }) {
	const payload = {
		algorithmVersion: ALGORITHM_VERSION,
		timezone: TIMEZONE,
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
			regularShiftEnd: null,
			overtimeMaxMinutes: 0,
			breakPolicy: {
				...DEFAULT_BREAK_POLICY,
				source: "fallback",
			},
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
	if (flags.includes("unpairedExitLikeMiddleCluster")) return "low";
	if (!usedShiftWindow) return "low";

	const hasAdjustedBoundary =
		flags.includes("arrivalBoundaryAdjusted") ||
		flags.includes("exitBoundaryAdjusted");

	const hasAmbiguousMiddle =
		flags.includes("ambiguousMiddleClusterIgnored") ||
		flags.includes("unclassifiedBreakCandidateIgnored") ||
		flags.includes("entryLikeClusterWithoutPriorExitIgnored");

	const hasOutsideDeduction = flags.includes("classifiedOutsideIntervalDeducted");

	if (
		middleClusters.length === 0 &&
		!hasAdjustedBoundary &&
		!hasAmbiguousMiddle &&
		!hasOutsideDeduction
	) {
		return "high";
	}

	if (hasAmbiguousMiddle) return "medium";

	return "medium";
}

function buildEmptyClustersPayload({
	breakPolicy,
	arrival = null,
	exit = null,
	middle = [],
	candidateBreaks = [],
	outsideIntervals = [],
	ignoredPostShiftMiddlePunches = [],
	notes = [],
}) {
	return {
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
		candidateBreaks,
		outsideIntervals,
		ignoredPostShiftMiddlePunches,
		notes,
	};
}

function computePresenceEstimateRecord({
	item,
	employeeShiftMap,
	shiftDataMap,
	employeeLogMap,
}) {
	const flags = [];

	const {
		shiftId,
		usedShiftWindow,
		regularShiftEnd,
		overtimeMaxMinutes,
		breakPolicy,
		logs,
	} = resolveWindowedLogs({
		item,
		employeeShiftMap,
		shiftDataMap,
		employeeLogMap,
	});

	if (!usedShiftWindow) {
		flags.push("noAssignedShift", "calendarDayWindowUsed");
	}

	if (breakPolicy.source === "shiftBreakPolicy") {
		flags.push("breakPolicyApplied");
	} else {
		flags.push("fallbackBreakPolicyUsed");
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
			flags: Array.from(new Set(flags)),
			clusters: buildEmptyClustersPayload({
				breakPolicy,
				notes: ["no raw punches found inside the estimate window"],
			}),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
				breakPolicy,
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
			flags: Array.from(new Set(flags)),
			clusters: buildEmptyClustersPayload({
				breakPolicy,
				arrival: serializeCluster(singleCluster, {
					role: "singlePunch",
					chosenBoundary: logs[0].timestamp,
					selectionRule: "single punch only; cannot infer exit",
					sideHint: getClusterSideHint(singleCluster, breakPolicy),
				}),
				notes: ["single punch cannot produce inside-duration estimate"],
			}),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
				breakPolicy,
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
			clusters: buildEmptyClustersPayload({
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
				logs,
				breakPolicy,
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

	const rawMiddleLogs = logs.slice(
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

	const middleLogs =
		regularShiftEnd
			? rawMiddleLogs.filter((log) => log.timestamp.isBefore(regularShiftEnd))
			: rawMiddleLogs;

	const ignoredPostShiftMiddleLogs =
		regularShiftEnd
			? rawMiddleLogs.filter((log) => !log.timestamp.isBefore(regularShiftEnd))
			: [];

	if (ignoredPostShiftMiddleLogs.length) {
		flags.push("postShiftMiddlePunchesIgnoredForBreakInference");
	}

	const middleClusters = buildConsecutiveClusters(
		middleLogs,
		PRESENCE_ESTIMATE_BREAK_CLUSTER_WINDOW_MINUTES
	);

	const {
		pairedCandidates,
		outsideIntervals,
		middleClusters: classifiedMiddleClusters,
	} = pairAndClassifyMiddleBreaks({
		middleClusters,
		breakPolicy,
		day: item.day,
		flags,
	});

	let grossInsideMinutes = estimatedInsideEnd.diff(
		estimatedInsideStart,
		"minute"
	);

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
			clusters: buildEmptyClustersPayload({
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
						sideHint: cluster.sideHint || getClusterSideHint(cluster, breakPolicy),
						selectionRule: `middle cluster ${index + 1}`,
					})
				),
				candidateBreaks: pairedCandidates,
				outsideIntervals,
				ignoredPostShiftMiddlePunches:
					ignoredPostShiftMiddleLogs.map(serializePunch),
				notes: ["estimated inside end is not after estimated inside start"],
			}),

			algorithmVersion: ALGORITHM_VERSION,
			inputHash: buildInputHash({
				item,
				shiftId,
				logs,
				breakPolicy,
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
			middleClusters: classifiedMiddleClusters,
			usedShiftWindow,
		}),
		flags: uniqueFlags,
		clusters: buildEmptyClustersPayload({
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
					sideHint: cluster.sideHint || getClusterSideHint(cluster, breakPolicy),
					selectionRule: `middle cluster ${index + 1}`,
				})
			),
			candidateBreaks: pairedCandidates,
			outsideIntervals,
			ignoredPostShiftMiddlePunches:
				ignoredPostShiftMiddleLogs.map(serializePunch),
			notes: [
				"this is an estimate, not a hard direction fact",
				"arrival boundary uses the boundary ambiguity window",
				"normal estimated end is scheduled shift end when a shift is known",
				"valid final overtime punch extends estimated inside end",
				"middle break clusters use the smaller break/noise window",
				"middle break inference uses shift.breakPolicy before env fallback",
				"middle clusters are paired only when an exit-like signal is followed by an entry-like signal",
				"candidate breaks are deducted only when classified by breakPolicy or explicit unclassified fallback",
				"post-shift middle punches are ignored for break inference",
			],
		}),

		algorithmVersion: ALGORITHM_VERSION,
		inputHash: buildInputHash({
			item,
			shiftId,
			logs,
			breakPolicy,
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