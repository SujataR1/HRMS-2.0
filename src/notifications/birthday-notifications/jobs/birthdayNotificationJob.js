import {
	sendBirthdayNotifications,
	sendWorkAnniversaryNotifications,
} from "../methods/birthdayNotificationMethods.js";

const DEFAULT_MILESTONE_NOTIFICATION_TIME = "12:00";
const BIRTHDAY_NOTIFICATION_TIME_ENV = "BIRTHDAY_NOTIFICATION_TIME";
const WORK_ANNIVERSARY_NOTIFICATION_TIME_ENV =
	"WORK_ANNIVERSARY_NOTIFICATION_TIME";

const milestoneJobs = [
	{
		key: "birthday",
		label: "Birthday",
		envName: BIRTHDAY_NOTIFICATION_TIME_ENV,
		run: sendBirthdayNotifications,
	},
	{
		key: "work_anniversary",
		label: "Work anniversary",
		envName: WORK_ANNIVERSARY_NOTIFICATION_TIME_ENV,
		run: sendWorkAnniversaryNotifications,
	},
];

let scheduleTimers = new Map();
let runningJobs = new Set();
let isSchedulerStopped = true;

function parseScheduleTime({ envName, logger }) {
	const rawValue =
		process.env[envName] || DEFAULT_MILESTONE_NOTIFICATION_TIME;
	const normalized = String(rawValue).trim();
	const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);

	if (!match) {
		logger?.warn?.(
			{
				envName,
				value: rawValue,
				defaultValue: DEFAULT_MILESTONE_NOTIFICATION_TIME,
			},
			"Invalid milestone notification time; using default."
		);

		return {
			value: DEFAULT_MILESTONE_NOTIFICATION_TIME,
			hour: 12,
			minute: 0,
		};
	}

	return {
		value: normalized,
		hour: Number(match[1]),
		minute: Number(match[2]),
	};
}

async function runMilestoneNotificationSequence({ job, logger }) {
	if (runningJobs.has(job.key)) {
		logger?.warn?.(
			{ milestone: job.key },
			"Employee milestone job execution skipped; a previous sequence run is still active."
		);
		return;
	}

	runningJobs.add(job.key);

	try {
		logger?.info?.(
			{ milestone: job.key },
			`Executing scheduled ${job.label.toLowerCase()} notifications check...`
		);

		const result = await job.run();

		if (
			result.birthdayEmployeesCount > 0 ||
			result.workAnniversaryEmployeesCount > 0 ||
			result.failuresCount > 0
		) {
			logger?.info?.(
				{ milestone: job.key, ...result },
				`${job.label} notification delivery processing finished.`
			);
		}

		return result;
	} catch (err) {
		logger?.error?.(
			{ err, milestone: job.key },
			`${job.label} notification routine failed to process.`
		);
	} finally {
		runningJobs.delete(job.key);
	}
}

function getNextRunAt({ hour, minute, fromDate = new Date() }) {
	const nextRunAt = new Date(fromDate);

	nextRunAt.setHours(hour, minute, 0, 0);

	if (nextRunAt <= fromDate) {
		nextRunAt.setDate(nextRunAt.getDate() + 1);
	}

	return nextRunAt;
}

function scheduleNextMilestoneNotificationRun({ job, logger }) {
	const scheduleTime = parseScheduleTime({
		envName: job.envName,
		logger,
	});
	const now = new Date();
	const nextRunAt = getNextRunAt({
		hour: scheduleTime.hour,
		minute: scheduleTime.minute,
		fromDate: now,
	});
	const delayMs = Math.max(nextRunAt.getTime() - now.getTime(), 0);

	const timer = setTimeout(async () => {
		scheduleTimers.delete(job.key);

		await runMilestoneNotificationSequence({ job, logger });

		if (!isSchedulerStopped) {
			scheduleNextMilestoneNotificationRun({ job, logger });
		}
	}, delayMs);

	timer.unref?.();
	scheduleTimers.set(job.key, timer);

	logger?.info?.(
		{
			milestone: job.key,
			envName: job.envName,
			scheduleTime: scheduleTime.value,
			nextRunAt: nextRunAt.toISOString(),
			delayMs,
		},
		`${job.label} notification job scheduled.`
	);
}

/**
 * Starts the automated daily employee milestone notification tasks.
 * BIRTHDAY_NOTIFICATION_TIME and WORK_ANNIVERSARY_NOTIFICATION_TIME use HH:mm.
 */
export function startBirthdayNotificationJob({ logger } = {}) {
	if (!isSchedulerStopped) {
		return stopBirthdayNotificationJob;
	}

	isSchedulerStopped = false;

	for (const job of milestoneJobs) {
		scheduleNextMilestoneNotificationRun({ job, logger });
	}

	logger?.info?.(
		"Employee milestone notification schedulers started successfully."
	);
	return stopBirthdayNotificationJob;
}

export function stopBirthdayNotificationJob() {
	isSchedulerStopped = true;

	for (const timer of scheduleTimers.values()) {
		clearTimeout(timer);
	}

	scheduleTimers = new Map();
	runningJobs = new Set();
}
