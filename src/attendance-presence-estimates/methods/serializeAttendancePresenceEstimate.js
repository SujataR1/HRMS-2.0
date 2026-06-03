import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export function presenceEstimateDateKey(attendanceDate) {
	return dayjs.utc(attendanceDate).format("YYYY-MM-DD");
}

export function buildPresenceEstimateMap(estimates = []) {
	const estimateMap = new Map();

	for (const estimate of estimates) {
		estimateMap.set(
			presenceEstimateDateKey(estimate.attendanceDate),
			estimate
		);
	}

	return estimateMap;
}

function formatDateTime(value) {
	if (!value) return null;

	return dayjs
		.utc(value)
		.tz(TIMEZONE)
		.format("YYYY-MM-DD hh:mm:ss a");
}

function formatTime(value) {
	if (!value) return null;

	return dayjs.utc(value).tz(TIMEZONE).format("hh:mm:ss a");
}

export function serializeAttendancePresenceEstimate(estimate) {
	if (!estimate) return null;

	const estimatedOutsideMinutes =
		estimate.clusters?.outsideIntervals?.reduce(
			(total, interval) => total + (Number(interval?.minutes) || 0),
			0
		) ?? 0;

	return {
		id: estimate.id,

		firstRawPunch: formatTime(estimate.firstRawPunch),
		lastRawPunch: formatTime(estimate.lastRawPunch),

		estimatedInsideStart: formatTime(estimate.estimatedInsideStart),
		estimatedInsideEnd: formatTime(estimate.estimatedInsideEnd),
		estimatedInsideMinutes: estimate.estimatedInsideMinutes,
		estimatedOutsideMinutes,

		confidence: estimate.confidence,
		flags: estimate.flags,

		clusters: estimate.clusters,

		algorithmVersion: estimate.algorithmVersion,
		inputHash: estimate.inputHash,

		computedAt: formatDateTime(estimate.computedAt),
		updatedAt: formatDateTime(estimate.updatedAt),
	};
}