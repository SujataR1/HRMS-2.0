import cron from "node-cron";
import { sendBirthdayNotifications } from "../methods/birthdayNotificationMethods.js";

let cronScheduleToken = null;
let isRunning = false;

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

/**
 * Starts the automated daily birthday notification task.
 * Cron expression '0 10 * * *' executes precisely at 10:00 AM every single day.
 */
export function startBirthdayNotificationJob({ logger } = {}) {
	if (cronScheduleToken) {
		return stopBirthdayNotificationJob;
	}

	cronScheduleToken = cron.schedule("0 11 * * *", () => {
		void runBirthdayNotificationSequence({ logger });
	});

	logger?.info?.("Birthday notifications cron job scheduler established successfully for 10:00 AM daily.");
	return stopBirthdayNotificationJob;
}

export function stopBirthdayNotificationJob() {
	if (!cronScheduleToken) return;

	cronScheduleToken.stop();
	cronScheduleToken = null;
}