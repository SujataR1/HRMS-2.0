import { sendEmployeeMilestoneNotifications } from "../methods/birthdayNotificationMethods.js";

const EMPLOYEE_MILESTONE_NOTIFICATION_HOUR = 12;
const EMPLOYEE_MILESTONE_NOTIFICATION_MINUTE = 30;

let scheduleTimer = null;
let isRunning = false;
let isSchedulerStopped = true;

async function runEmployeeMilestoneNotificationSequence({ logger }) {
	if (isRunning) {
		logger?.warn?.("Employee milestone job execution skipped; a previous sequence run is still active.");
		return;
	}

	isRunning = true;

	try {
		logger?.info?.("Executing daily scheduled employee milestone notifications check...");
		const result = await sendEmployeeMilestoneNotifications();
		
		if (
			result.birthdayEmployeesCount > 0 ||
			result.workAnniversaryEmployeesCount > 0 ||
			result.failuresCount > 0
		) {
			logger?.info?.(result, "Employee milestone notification delivery processing finished.");
		}
		return result;
	} catch (err) {
		logger?.error?.({ err }, "Employee milestone notification routine failed to process.");
	} finally {
		isRunning = false;
	}
}

function getNextEmployeeMilestoneNotificationRunAt(fromDate = new Date()) {
	const nextRunAt = new Date(fromDate);

	nextRunAt.setHours(
		EMPLOYEE_MILESTONE_NOTIFICATION_HOUR,
		EMPLOYEE_MILESTONE_NOTIFICATION_MINUTE,
		0,
		0
	);

	if (nextRunAt <= fromDate) {
		nextRunAt.setDate(nextRunAt.getDate() + 1);
	}

	return nextRunAt;
}

function scheduleNextEmployeeMilestoneNotificationRun({ logger }) {
	const now = new Date();
	const nextRunAt = getNextEmployeeMilestoneNotificationRunAt(now);
	const delayMs = Math.max(nextRunAt.getTime() - now.getTime(), 0);

	scheduleTimer = setTimeout(async () => {
		scheduleTimer = null;

		await runEmployeeMilestoneNotificationSequence({ logger });

		if (!isSchedulerStopped) {
			scheduleNextEmployeeMilestoneNotificationRun({ logger });
		}
	}, delayMs);

	scheduleTimer.unref?.();

	logger?.info?.(
		{ nextRunAt: nextRunAt.toISOString(), delayMs },
		"Employee milestone notification job scheduled."
	);
}

/**
 * Starts the automated daily employee milestone notification task.
 * Executes at 12:00 PM local server time every single day.
 */
export function startBirthdayNotificationJob({ logger } = {}) {
	if (!isSchedulerStopped) {
		return stopBirthdayNotificationJob;
	}

	isSchedulerStopped = false;
	scheduleNextEmployeeMilestoneNotificationRun({ logger });

	logger?.info?.("Employee milestone notifications scheduler started successfully for 12:00 PM daily.");
	return stopBirthdayNotificationJob;
}

export function stopBirthdayNotificationJob() {
	isSchedulerStopped = true;

	if (!scheduleTimer) return;

	clearTimeout(scheduleTimer);
	scheduleTimer = null;
}
