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
		status: "closed",

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

function normalizeAnomaly(anomaly) {
	return {
		type: "anomaly",
		status: "recorded",

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
	anomalies,
}) {
	return [
		...insideSessions,
		...breaks,
		...anomalies,
	].sort((left, right) => parseEventSortTime(left) - parseEventSortTime(right));
}

function buildState({ currentlyIn }) {
	return {
		currentlyIn,
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
 * Public presence contract:
 * - completed inside sessions are exposed as closed chunks
 * - completed breaks are exposed as closed chunks
 * - anomalies are exposed as audit events
 * - open inside session is not exposed as a completed chunk
 * - open outside interval is never exposed as an open break
 * - live state exposes only whether the employee is currently in
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

	const anomalies = Array.isArray(clusters.anomalies)
		? clusters.anomalies.map(normalizeAnomaly)
		: [];

	const currentlyIn =
		typeof clusters.currentlyIn === "boolean"
			? clusters.currentlyIn
			: Boolean(clusters.openInsideSession);

	const history = buildHistory({
		insideSessions,
		breaks,
		anomalies,
	});

	const completedInsideMinutes = sumClosedMinutes(insideSessions);
	const completedBreakMinutes = sumClosedMinutes(breaks);

	return {
		id: estimate.id,

		available: true,
		confidence: estimate.confidence,

		state: buildState({
			currentlyIn,
		}),

		totals: {
			currentlyIn,

			completedInsideMinutes,
			completedBreakMinutes,

			insideSessionCount: insideSessions.length,
			breakCount: breaks.length,
			anomalyCount: anomalies.length,

			insideMinutes: estimate.estimatedInsideMinutes,
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

			currentState: clusters.currentState ?? null,
			currentlyIn,
			lastDirectionalPunch: clusters.lastDirectionalPunch ?? null,

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