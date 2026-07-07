import { sendBirthdayNotifications } from "../methods/birthdayNotificationMethods.js";

const BIRTHDAY_NOTIFICATION_HOUR = 11;
const BIRTHDAY_NOTIFICATION_MINUTE = 0;

let scheduleTimer = null;
let isRunning = false;
let isSchedulerStopped = true;

async function runBirthdayNotificationSequence({ logger }) {
	if (isRunning) {
		logger?.warn?.("Birthday job execution skipped; a previous sequence run is still active.");
		return;
	}

	isRunning = true;

	try {
		logger?.info?.("Executing daily scheduled birthday notifications check...");
		const result = await sendBirthdayNotifications();
		
		if (result.employeesNotifiedCount > 0) {
			logger?.info?.(result, "Birthday notification delivery processing finished successfully.");
		}
		return result;
	} catch (err) {
		logger?.error?.({ err }, "Birthday notification routine failed to process.");
	} finally {
		isRunning = false;
	}
}

function getNextBirthdayNotificationRunAt(fromDate = new Date()) {
	const nextRunAt = new Date(fromDate);

	nextRunAt.setHours(
		BIRTHDAY_NOTIFICATION_HOUR,
		BIRTHDAY_NOTIFICATION_MINUTE,
		0,
		0
	);

	if (nextRunAt <= fromDate) {
		nextRunAt.setDate(nextRunAt.getDate() + 1);
	}

	return nextRunAt;
}

function scheduleNextBirthdayNotificationRun({ logger }) {
	const now = new Date();
	const nextRunAt = getNextBirthdayNotificationRunAt(now);
	const delayMs = Math.max(nextRunAt.getTime() - now.getTime(), 0);

	scheduleTimer = setTimeout(async () => {
		scheduleTimer = null;

		await runBirthdayNotificationSequence({ logger });

		if (!isSchedulerStopped) {
			scheduleNextBirthdayNotificationRun({ logger });
		}
	}, delayMs);

	scheduleTimer.unref?.();

	logger?.info?.(
		{ nextRunAt: nextRunAt.toISOString(), delayMs },
		"Birthday notification job scheduled."
	);
}

/**
 * Starts the automated daily birthday notification task.
 * Executes at 11:00 AM local server time every single day.
 */
export function startBirthdayNotificationJob({ logger } = {}) {
	if (!isSchedulerStopped) {
		return stopBirthdayNotificationJob;
	}

	isSchedulerStopped = false;
	scheduleNextBirthdayNotificationRun({ logger });

	logger?.info?.("Birthday notifications scheduler started successfully for 11:00 AM daily.");
	return stopBirthdayNotificationJob;
}

export function stopBirthdayNotificationJob() {
	isSchedulerStopped = true;

	if (!scheduleTimer) return;

	clearTimeout(scheduleTimer);
	scheduleTimer = null;
}
