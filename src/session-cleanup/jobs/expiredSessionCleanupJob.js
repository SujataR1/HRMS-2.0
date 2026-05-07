import { cleanupExpiredSessions } from "../methods/cleanupExpiredSessions.js";

const DEFAULT_INTERVAL_MS =24 * 60 * 60 * 1000;

let timer = null;
let isRunning = false;

function resolveIntervalMs() {
	const raw = Number(process.env.EXPIRED_SESSION_CLEANUP_INTERVAL_MS);

	if (Number.isFinite(raw) && raw >= 60_000) {
		return raw;
	}

	return DEFAULT_INTERVAL_MS;
}

async function runExpiredSessionCleanup({ logger, reason }) {
	if (isRunning) {
		logger?.warn?.(
			{ reason },
			"Expired session cleanup skipped because previous run is still active"
		);
		return;
	}

	isRunning = true;

	try {
		const result = await cleanupExpiredSessions();

		if (result.totalDeleted > 0) {
			logger?.info?.(
				{ reason, ...result },
				"Expired session cleanup completed"
			);
		}

		return result;
	} catch (err) {
		logger?.error?.(
			{ err, reason },
			"Expired session cleanup failed"
		);
	} finally {
		isRunning = false;
	}
}

export function startExpiredSessionCleanupJob({ logger } = {}) {
	if (timer) {
		return stopExpiredSessionCleanupJob;
	}

	const intervalMs = resolveIntervalMs();

	void runExpiredSessionCleanup({
		logger,
		reason: "startup",
	});

	timer = setInterval(() => {
		void runExpiredSessionCleanup({
			logger,
			reason: "interval",
		});
	}, intervalMs);

	logger?.info?.(
		{ intervalMs },
		"Expired session cleanup job started"
	);

	return stopExpiredSessionCleanupJob;
}

export function stopExpiredSessionCleanupJob() {
	if (!timer) return;

	clearInterval(timer);
	timer = null;
}