import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

function formatTime(value) {
	if (!value) return null;

	return dayjs.utc(value).tz(TIMEZONE).format("hh:mm:ss a");
}

function formatDateTime(value) {
	if (!value) return null;

	return dayjs.utc(value).tz(TIMEZONE).format("YYYY-MM-DD hh:mm:ss a");
}

function formatClusterLocalTime(value) {
	if (!value) return null;

	const parsed = dayjs.tz(value, "YYYY-MM-DD HH:mm:ss", TIMEZONE);

	if (parsed.isValid()) {
		return parsed.format("hh:mm:ss a");
	}

	const fallback = dayjs(value);

	return fallback.isValid() ? fallback.tz(TIMEZONE).format("hh:mm:ss a") : null;
}

function presenceEstimateDateKey(date) {
	return dayjs.utc(date).tz(TIMEZONE).format("YYYY-MM-DD");
}

function buildPresenceEstimateMap(estimates = []) {
	const map = new Map();

	for (const estimate of estimates) {
		map.set(presenceEstimateDateKey(estimate.attendanceDate), estimate);
	}

	return map;
}

function normalizeCompletedInsideSession(session) {
	return {
		type: "inside",
		from: formatClusterLocalTime(session.fromLocal),
		to: formatClusterLocalTime(session.toLocal),
		fromLocal: session.fromLocal ?? null,
		toLocal: session.toLocal ?? null,
		fromUtc: session.fromUtc ?? null,
		toUtc: session.toUtc ?? null,
		minutes: Number.isFinite(Number(session.minutes))
			? Number(session.minutes)
			: null,
		status: "closed",
		source: session.source ?? "directionalPunchState",
	};
}

function normalizeBreakInterval(interval) {
	return {
		type: "break",
		from: formatClusterLocalTime(interval.fromLocal),
		to: formatClusterLocalTime(interval.toLocal),
		fromLocal: interval.fromLocal ?? null,
		toLocal: interval.toLocal ?? null,
		fromUtc: interval.fromUtc ?? null,
		toUtc: interval.toUtc ?? null,
		minutes: Number.isFinite(Number(interval.minutes))
			? Number(interval.minutes)
			: null,
		status: "closed",
		source: interval.source ?? "directionalPunchState",
	};
}

function normalizeOpenInsideSession(openInsideSession) {
	if (!openInsideSession) return null;

	return {
		type: "inside",
		from: formatClusterLocalTime(openInsideSession.fromLocal),
		to: null,
		fromLocal: openInsideSession.fromLocal ?? null,
		toLocal: null,
		fromUtc: openInsideSession.fromUtc ?? null,
		toUtc: null,
		minutes: null,
		status: "open",
		source: openInsideSession.source ?? "directionalPunchState",
	};
}

function sortHistory(history) {
	return history.sort((left, right) => {
		const leftValue =
			Date.parse(left.fromUtc || left.fromLocal || "") || Number.MAX_SAFE_INTEGER;

		const rightValue =
			Date.parse(right.fromUtc || right.fromLocal || "") ||
			Number.MAX_SAFE_INTEGER;

		return leftValue - rightValue;
	});
}

function sumMinutes(items) {
	return items.reduce((total, item) => {
		const minutes = Number(item.minutes);

		return Number.isFinite(minutes) ? total + minutes : total;
	}, 0);
}

function buildState({ currentState, openInsideSession, history }) {
	if (currentState === "inside") {
		return {
			current: "inside",
			since: openInsideSession?.from ?? null,
			sinceLocal: openInsideSession?.fromLocal ?? null,
			sinceUtc: openInsideSession?.fromUtc ?? null,
			openSession: openInsideSession,
		};
	}

	if (currentState === "outside") {
		const lastBreak = [...history]
			.reverse()
			.find((item) => item.type === "break");

		return {
			current: "outside",
			since: lastBreak?.from ?? null,
			sinceLocal: lastBreak?.fromLocal ?? null,
			sinceUtc: lastBreak?.fromUtc ?? null,
			openSession: null,
		};
	}

	return {
		current: "unknown",
		since: null,
		sinceLocal: null,
		sinceUtc: null,
		openSession: null,
	};
}

function buildAvailability(estimate, clusters) {
	if (!estimate) {
		return {
			available: false,
			reason: "notComputed",
		};
	}

	if (clusters?.mode !== "directionalOnly") {
		return {
			available: false,
			reason: "notDirectionalOnlyEstimate",
		};
	}

	return {
		available: true,
		reason: null,
	};
}

function buildRawPunchAudit(clusters) {
	const rawPunches = clusters?.rawLogicalPunches;

	if (!Array.isArray(rawPunches)) return [];

	return rawPunches.map((punch) => ({
		at: formatClusterLocalTime(punch.atLocal),
		atLocal: punch.atLocal ?? null,
		atUtc: punch.atUtc ?? null,
		punchState: punch.punchState ?? null,
		identifiers: punch.identifiers ?? [],
		rawRowCount: punch.rawRowCount ?? null,
	}));
}

export function serializeAttendancePresenceEstimate(estimate) {
	if (!estimate) return null;

	const clusters = estimate.clusters || {};

	const availability = buildAvailability(estimate, clusters);

	if (!availability.available) {
		return {
			id: estimate.id,
			available: false,
			reason: availability.reason,

			confidence: estimate.confidence,
			flags: estimate.flags ?? [],

			audit: {
				algorithmVersion: estimate.algorithmVersion,
				inputHash: estimate.inputHash,
				computedAt: formatDateTime(estimate.computedAt),
				updatedAt: formatDateTime(estimate.updatedAt),
			},
		};
	}

	const insideSessions = Array.isArray(clusters.insideSessions)
		? clusters.insideSessions.map(normalizeCompletedInsideSession)
		: [];

	const outsideIntervals = Array.isArray(clusters.outsideIntervals)
		? clusters.outsideIntervals.map(normalizeBreakInterval)
		: [];

	const openInsideSession = normalizeOpenInsideSession(
		clusters.openInsideSession
	);

	const currentState =
		clusters.currentState ||
		(openInsideSession ? "inside" : "outside");

	const history = sortHistory([
		...insideSessions,
		...outsideIntervals,
		...(openInsideSession ? [openInsideSession] : []),
	]);

	const completedInsideMinutes = sumMinutes(insideSessions);
	const completedBreakMinutes = sumMinutes(outsideIntervals);

	return {
		id: estimate.id,
		available: true,

		confidence: estimate.confidence,

		state: buildState({
			currentState,
			openInsideSession,
			history,
		}),

		totals: {
			completedInsideMinutes,
			completedBreakMinutes,

			estimatedInsideMinutes: estimate.estimatedInsideMinutes,
			estimatedOutsideMinutes: completedBreakMinutes,
		},

		bounds: {
			firstPunch: formatTime(estimate.firstRawPunch),
			lastPunch: formatTime(estimate.lastRawPunch),

			start: formatTime(estimate.estimatedInsideStart),
			end: formatTime(estimate.estimatedInsideEnd),
		},

		history,

		breaks: outsideIntervals,
		insideSessions,

		audit: {
			mode: clusters.mode ?? "directionalOnly",
			directionCoverage: clusters.directionCoverage ?? null,
			flags: estimate.flags ?? [],
			rawPunches: buildRawPunchAudit(clusters),
			algorithmVersion: estimate.algorithmVersion,
			inputHash: estimate.inputHash,
			computedAt: formatDateTime(estimate.computedAt),
			updatedAt: formatDateTime(estimate.updatedAt),
		},
	};
}

export {
	buildPresenceEstimateMap,
	presenceEstimateDateKey,
};