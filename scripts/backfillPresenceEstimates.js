import "dotenv/config";
import { prisma } from "#src/db/prisma.js";
import { makeAttendancePresenceEstimateBatch } from "#src/attendance-presence-estimates/methods/makeAttendancePresenceEstimateBatch.js";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

function readArg(name, fallback = null) {
	const prefix = `--${name}=`;
	const found = process.argv.find((arg) => arg.startsWith(prefix));

	return found ? found.slice(prefix.length) : fallback;
}

function readBooleanFlag(name) {
	return process.argv.includes(`--${name}`);
}

function readPositiveIntArg(name, fallback, { min = 1, max = 1000 } = {}) {
	const value = Number(readArg(name));

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

function parseDayArg(name) {
	const value = readArg(name);

	if (!value) return null;

	const parsed = dayjs.tz(value, TIMEZONE).startOf("day");

	if (!parsed.isValid()) {
		throw new Error(`--${name} must be a valid YYYY-MM-DD date`);
	}

	return parsed;
}

function biometricTimestampToDayKey(timestamp) {
	return dayjs.utc(timestamp).tz(TIMEZONE).format("YYYY-MM-DD");
}

function chunkArray(items, size) {
	const chunks = [];

	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}

	return chunks;
}

async function resolveDateRange() {
	const fromArg = parseDayArg("from");
	const toArg = parseDayArg("to");

	if (fromArg && toArg && toArg.isBefore(fromArg)) {
		throw new Error("--to cannot be before --from");
	}

	if (fromArg && toArg) {
		return {
			fromDay: fromArg,
			toDay: toArg,
		};
	}

	const [firstRow, lastRow] = await Promise.all([
		prisma.biometricLog.findFirst({
			orderBy: {
				timestamp: "asc",
			},
			select: {
				timestamp: true,
			},
		}),

		prisma.biometricLog.findFirst({
			orderBy: {
				timestamp: "desc",
			},
			select: {
				timestamp: true,
			},
		}),
	]);

	if (!firstRow || !lastRow) {
		return {
			fromDay: null,
			toDay: null,
		};
	}

	return {
		fromDay:
			fromArg || dayjs.utc(firstRow.timestamp).tz(TIMEZONE).startOf("day"),

		toDay:
			toArg || dayjs.utc(lastRow.timestamp).tz(TIMEZONE).startOf("day"),
	};
}

async function fetchBiometricEmployeeDaysForDay({ day, employeeId }) {
	const dayStartUTC = day.startOf("day").utc().toDate();
	const dayEndUTC = day.endOf("day").utc().toDate();

	const rows = await prisma.biometricLog.findMany({
		where: {
			...(employeeId ? { employeeId } : {}),
			timestamp: {
				gte: dayStartUTC,
				lte: dayEndUTC,
			},
		},
		select: {
			employeeId: true,
			timestamp: true,
		},
		orderBy: [
			{
				employeeId: "asc",
			},
			{
				timestamp: "asc",
			},
		],
	});

	const unique = new Map();

	for (const row of rows) {
		const dayKey = biometricTimestampToDayKey(row.timestamp);
		const key = `${row.employeeId}_${dayKey}`;

		if (!unique.has(key)) {
			unique.set(key, {
				employeeId: row.employeeId,
				date: dayKey,
			});
		}
	}

	return Array.from(unique.values());
}

async function main() {
	const batchSize = readPositiveIntArg("batch-size", 50, {
		min: 1,
		max: 500,
	});

	const dryRun = readBooleanFlag("dry-run");
	const employeeId = readArg("employee-id");

	const { fromDay, toDay } = await resolveDateRange();

	if (!fromDay || !toDay) {
		console.log(
			JSON.stringify({
				job: "generatePresenceBreakData",
				status: "nothing-to-do",
				reason: "No BiometricLog rows found",
			})
		);

		return;
	}

	console.log(
		JSON.stringify({
			job: "generatePresenceBreakData",
			mode: dryRun ? "dry-run" : "write",
			source: "BiometricLog employee-days",
			timezone: TIMEZONE,
			from: fromDay.format("YYYY-MM-DD"),
			to: toDay.format("YYYY-MM-DD"),
			employeeId: employeeId || null,
			batchSize,
			behavior: {
				generates: "directional presence + inside sessions + break intervals",
				usesRawBiometricLogs: true,
				usesAttendanceLogAsSource: false,
				usesBreakPolicy: false,
				usesEnvEstimatorKnobs: false,
				usesClustering: false,
				deletesStaleRows: false,
				skipsWhenPunchStateMissingOrConflicting: true,
			},
		})
	);

	let scannedDays = 0;
	let candidateEmployeeDays = 0;
	let processedEmployeeDays = 0;
	let upsertedPresenceRows = 0;

	for (
		let day = fromDay.clone();
		day.isSameOrBefore(toDay, "day");
		day = day.add(1, "day")
	) {
		scannedDays += 1;

		const employeeDays = await fetchBiometricEmployeeDaysForDay({
			day,
			employeeId,
		});

		candidateEmployeeDays += employeeDays.length;

		if (!employeeDays.length) {
			console.log(
				JSON.stringify({
					day: day.format("YYYY-MM-DD"),
					candidateEmployeeDays: 0,
					status: "skipped-no-biometric-days",
				})
			);

			continue;
		}

		const chunks = chunkArray(employeeDays, batchSize);

		console.log(
			JSON.stringify({
				day: day.format("YYYY-MM-DD"),
				candidateEmployeeDays: employeeDays.length,
				chunks: chunks.length,
				status: dryRun ? "dry-run" : "processing",
			})
		);

		for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
			const chunk = chunks[chunkIndex];

			if (dryRun) {
				processedEmployeeDays += chunk.length;

				console.log(
					JSON.stringify({
						day: day.format("YYYY-MM-DD"),
						chunk: chunkIndex + 1,
						chunkSize: chunk.length,
						status: "dry-run",
					})
				);

				continue;
			}

			const result = await makeAttendancePresenceEstimateBatch({
				employeeDays: chunk,
			});

			processedEmployeeDays += result.processed;
			upsertedPresenceRows += result.upserted;

			console.log(
				JSON.stringify({
					day: day.format("YYYY-MM-DD"),
					chunk: chunkIndex + 1,
					chunkSize: chunk.length,
					processed: result.processed,
					upsertedPresenceRows: result.upserted,
					skippedOrUnchanged: result.processed - result.upserted,
					status: "done",
				})
			);
		}
	}

	console.log(
		JSON.stringify({
			job: "generatePresenceBreakData",
			status: "complete",
			source: "BiometricLog",
			scannedDays,
			candidateEmployeeDays,
			processedEmployeeDays,
			upsertedPresenceRows,
			note:
				"Skipped/unchanged employee-days either had missing/conflicting punchState or no eligible directional presence row was produced.",
		})
	);
}

try {
	await main();
} catch (error) {
	console.error(
		JSON.stringify({
			job: "generatePresenceBreakData",
			status: "failed",
			message: error.message,
			stack: error.stack,
		})
	);

	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}