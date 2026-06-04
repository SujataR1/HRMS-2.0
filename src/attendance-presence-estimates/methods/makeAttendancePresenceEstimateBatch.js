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

function formatLocalDateTimeToTime(value) {
	if (!value) return null;

	const parsed = dayjs.tz(value, "YYYY-MM-DD HH:mm:ss", TIMEZONE);

	if (parsed.isValid()) {
		return parsed.format("hh:mm:ss a");
	}

	const fallback = dayjs(value);

	return fallback.isValid() ? fallback.tz(TIMEZONE).format("hh:mm:ss a") : null;
}

function parseEventSortTime(item) {
	return (
		Date.parse(item.fromUtc || item.atUtc || item.fromLocal || item.atLocal || "") ||
		Number.MAX_SAFE_INTEGER
	);
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

function minuteValue(value) {
	const minutes = Number(value);

	return Number.isFinite(minutes) ? minutes : null;
}

function sumClosedMinutes(items) {
	return items.reduce((total, item) => {
		const minutes = minuteValue(item.minutes);

		return minutes == null ? total : total + minutes;
	}, 0);
}

function normalizeInsideSession(session) {
	return {
		type: "inside",
		status: "closed",

		from: formatLocalDateTimeToTime(session.fromLocal),
		to: formatLocalDateTimeToTime(session.toLocal),

		fromLocal: session.fromLocal ?? null,
		toLocal: session.toLocal ?? null,

		fromUtc: session.fromUtc ?? null,
		toUtc: session.toUtc ?? null,

		minutes: minuteValue(session.minutes),

		source: session.source ?? "directionalPunchState",
	};
}

function normalizeBreakInterval(interval) {
	return {
		type: "break",
		status: interval.status ?? "closed",

		from: formatLocalDateTimeToTime(interval.fromLocal),
		to: formatLocalDateTimeToTime(interval.toLocal),

		fromLocal: interval.fromLocal ?? null,
		toLocal: interval.toLocal ?? null,

		fromUtc: interval.fromUtc ?? null,
		toUtc: interval.toUtc ?? null,

		minutes: minuteValue(interval.minutes),

		source: interval.source ?? "directionalPunchState",
	};
}

function normalizeOpenInsideSession(openInsideSession) {
	if (!openInsideSession) return null;

	return {
		type: "inside",
		status: "open",

		from: formatLocalDateTimeToTime(openInsideSession.fromLocal),
		to: null,

		fromLocal: openInsideSession.fromLocal ?? null,
		toLocal: null,

		fromUtc: openInsideSession.fromUtc ?? null,
		toUtc: null,

		minutes: null,

		source: openInsideSession.source ?? "directionalPunchState",
	};
}

function normalizeOpenOutsideInterval(openOutsideInterval) {
	if (!openOutsideInterval) return null;

	return {
		type: "break",
		status: "open",

		from: formatLocalDateTimeToTime(openOutsideInterval.fromLocal),
		to: null,

		fromLocal: openOutsideInterval.fromLocal ?? null,
		toLocal: null,

		fromUtc: openOutsideInterval.fromUtc ?? null,
		toUtc: null,

		minutes: null,

		source: openOutsideInterval.source ?? "directionalPunchState",
	};
}

function normalizeAnomaly(anomaly) {
	return {
		type: "anomaly",
		status: "open",

		code: anomaly.code ?? "unknownPresenceAnomaly",
		message: anomaly.message ?? null,

		at: formatLocalDateTimeToTime(anomaly.atLocal),
		atLocal: anomaly.atLocal ?? null,
		atUtc: anomaly.atUtc ?? null,

		previousState: anomaly.previousState ?? null,
		currentState: anomaly.currentState ?? null,

		punch: anomaly.punch ?? null,
	};
}

function buildHistory({
	insideSessions,
	breaks,
	openInsideSession,
	openBreak,
	anomalies,
}) {
	return [
		...insideSessions,
		...breaks,
		...(openInsideSession ? [openInsideSession] : []),
		...(openBreak ? [openBreak] : []),
		...anomalies,
	].sort((left, right) => parseEventSortTime(left) - parseEventSortTime(right));
}

function buildState({ currentState, openInsideSession, openBreak, history }) {
	if (currentState === "inside") {
		return {
			current: "inside",
			since: openInsideSession?.from ?? null,
			sinceLocal: openInsideSession?.fromLocal ?? null,
			sinceUtc: openInsideSession?.fromUtc ?? null,
			open: openInsideSession,
		};
	}

	if (currentState === "outside") {
		const latestBreak =
			openBreak ||
			[...history].reverse().find((item) => item.type === "break") ||
			null;

		return {
			current: "outside",
			since: latestBreak?.from ?? null,
			sinceLocal: latestBreak?.fromLocal ?? null,
			sinceUtc: latestBreak?.fromUtc ?? null,
			open: openBreak,
		};
	}

	return {
		current: "unknown",
		since: null,
		sinceLocal: null,
		sinceUtc: null,
		open: null,
	};
}

function buildRawPunchAudit(clusters) {
	const punches = clusters?.rawLogicalPunches;

	if (!Array.isArray(punches)) return [];

	return punches.map((punch) => ({
		at: formatLocalDateTimeToTime(punch.atLocal),
		atLocal: punch.atLocal ?? null,
		atUtc: punch.atUtc ?? null,

		punchState: punch.punchState ?? null,
		punchStates: punch.punchStates ?? [],

		identifiers: punch.identifiers ?? [],
		rawRowCount: punch.rawRowCount ?? null,
	}));
}

/**
 * Serialize stored AttendancePresenceEstimate as the public API "presence".
 *
 * DB/model name may still say "PresenceEstimate" during development.
 * API shape should say "presence" because the data is directional state/history.
 */
export function serializeAttendancePresenceEstimate(estimate) {
	if (!estimate) return null;

	const clusters = estimate.clusters || {};

	const insideSessions = Array.isArray(clusters.insideSessions)
		? clusters.insideSessions.map(normalizeInsideSession)
		: [];

	const breaks = Array.isArray(clusters.outsideIntervals)
		? clusters.outsideIntervals.map(normalizeBreakInterval)
		: [];

	const openInsideSession = normalizeOpenInsideSession(
		clusters.openInsideSession
	);

	const openBreak = normalizeOpenOutsideInterval(clusters.openOutsideInterval);

	const anomalies = Array.isArray(clusters.anomalies)
		? clusters.anomalies.map(normalizeAnomaly)
		: [];

	const history = buildHistory({
		insideSessions,
		breaks,
		openInsideSession,
		openBreak,
		anomalies,
	});

	const currentState =
		clusters.currentState ||
		(openInsideSession ? "inside" : openBreak ? "outside" : "unknown");

	const completedInsideMinutes = sumClosedMinutes(insideSessions);
	const completedBreakMinutes = sumClosedMinutes(breaks);

	return {
		id: estimate.id,

		available: true,
		confidence: estimate.confidence,

		state: buildState({
			currentState,
			openInsideSession,
			openBreak,
			history,
		}),

		totals: {
			completedInsideMinutes,
			completedBreakMinutes,

			insideSessionCount: insideSessions.length,
			breakCount: breaks.length,
			anomalyCount: anomalies.length,

			/**
			 * Null means the employee is currently inside or the current session is open.
			 * Do not store running live minutes in DB because it becomes stale.
			 */
			insideMinutes: estimate.estimatedInsideMinutes,

			/**
			 * This is the sum of completed out→in break intervals only.
			 * If the employee is currently outside, the open break is shown in state.open/history
			 * but not counted as completed minutes yet.
			 */
			breakMinutes: completedBreakMinutes,
		},

		bounds: {
			firstPunch: formatTime(estimate.firstRawPunch),
			lastPunch: formatTime(estimate.lastRawPunch),

			insideStart: formatTime(estimate.estimatedInsideStart),
			insideEnd: formatTime(estimate.estimatedInsideEnd),
		},

		history,

		insideSessions,
		breaks,
		anomalies,

		audit: {
			mode: clusters.mode ?? "directionalState",
			directionCoverage: clusters.directionCoverage ?? null,
			rawPunches: buildRawPunchAudit(clusters),

			flags: estimate.flags ?? [],
			notes: clusters.notes ?? [],

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