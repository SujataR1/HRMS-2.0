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

function readPositiveIntArg(name, fallback, { min = 1, max = 5000 } = {}) {
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

function attendanceDateToDayKey(attendanceDate) {
	return dayjs.utc(attendanceDate).tz(TIMEZONE).format("YYYY-MM-DD");
}

function chunkArray(items, size) {
	const chunks = [];

	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
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
		prisma.attendanceLog.findFirst({
			orderBy: {
				attendanceDate: "asc",
			},
			select: {
				attendanceDate: true,
			},
		}),
		prisma.attendanceLog.findFirst({
			orderBy: {
				attendanceDate: "desc",
			},
			select: {
				attendanceDate: true,
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
			fromArg ||
			dayjs.utc(firstRow.attendanceDate).tz(TIMEZONE).startOf("day"),
		toDay:
			toArg ||
			dayjs.utc(lastRow.attendanceDate).tz(TIMEZONE).startOf("day"),
	};
}

async function fetchAttendanceEmployeeDaysForDay({ day, employeeId }) {
	const dayStartUTC = day.startOf("day").utc().toDate();
	const dayEndUTC = day.endOf("day").utc().toDate();

	const rows = await prisma.attendanceLog.findMany({
		where: {
			...(employeeId ? { employeeId } : {}),
			attendanceDate: {
				gte: dayStartUTC,
				lte: dayEndUTC,
			},
		},
		select: {
			employeeId: true,
			attendanceDate: true,
		},
		orderBy: {
			employeeId: "asc",
		},
	});

	const unique = new Map();

	for (const row of rows) {
		const dayKey = attendanceDateToDayKey(row.attendanceDate);
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

async function removeExistingEstimateDays(employeeDays) {
	if (!employeeDays.length) return [];

	const employeeIds = Array.from(
		new Set(employeeDays.map((item) => item.employeeId))
	);

	const attendanceDates = Array.from(
		new Set(
			employeeDays.map((item) =>
				dayjs.tz(item.date, TIMEZONE).startOf("day").utc().toISOString()
			)
		)
	).map((iso) => new Date(iso));

	const existing = await prisma.attendancePresenceEstimate.findMany({
		where: {
			employeeId: {
				in: employeeIds,
			},
			attendanceDate: {
				in: attendanceDates,
			},
		},
		select: {
			employeeId: true,
			attendanceDate: true,
		},
	});

	const existingKeys = new Set(
		existing.map((estimate) => {
			const dayKey = attendanceDateToDayKey(estimate.attendanceDate);
			return `${estimate.employeeId}_${dayKey}`;
		})
	);

	return employeeDays.filter((item) => {
		const key = `${item.employeeId}_${item.date}`;
		return !existingKeys.has(key);
	});
}

async function main() {
	const batchSize = readPositiveIntArg("batch-size", 100, {
		min: 1,
		max: 1000,
	});

	const dryRun = readBooleanFlag("dry-run");
	const onlyMissing = readBooleanFlag("only-missing");
	const employeeId = readArg("employee-id");

	const { fromDay, toDay } = await resolveDateRange();

	if (!fromDay || !toDay) {
		console.log(
			JSON.stringify({
				job: "backfillPresenceEstimates",
				status: "nothing-to-do",
				reason: "No AttendanceLog rows found",
			})
		);
		return;
	}

	console.log(
		JSON.stringify({
			job: "backfillPresenceEstimates",
			mode: dryRun ? "dry-run" : "write",
			source: "AttendanceLog",
			timezone: TIMEZONE,
			from: fromDay.format("YYYY-MM-DD"),
			to: toDay.format("YYYY-MM-DD"),
			employeeId: employeeId || null,
			batchSize,
			onlyMissing,
		})
	);

	let scannedDays = 0;
	let candidateEmployeeDays = 0;
	let processed = 0;
	let upserted = 0;
	let skippedExisting = 0;

	for (
		let day = fromDay.clone();
		day.isSameOrBefore(toDay, "day");
		day = day.add(1, "day")
	) {
		scannedDays += 1;

		let employeeDays = await fetchAttendanceEmployeeDaysForDay({
			day,
			employeeId,
		});

		const originalCount = employeeDays.length;
		candidateEmployeeDays += originalCount;

		if (onlyMissing && employeeDays.length) {
			employeeDays = await removeExistingEstimateDays(employeeDays);
			skippedExisting += originalCount - employeeDays.length;
		}

		if (!employeeDays.length) {
			console.log(
				JSON.stringify({
					day: day.format("YYYY-MM-DD"),
					candidateEmployeeDays: originalCount,
					toProcess: 0,
					status: "skipped",
				})
			);
			continue;
		}

		const chunks = chunkArray(employeeDays, batchSize);

		console.log(
			JSON.stringify({
				day: day.format("YYYY-MM-DD"),
				candidateEmployeeDays: originalCount,
				toProcess: employeeDays.length,
				chunks: chunks.length,
				status: dryRun ? "dry-run" : "processing",
			})
		);

		for (let i = 0; i < chunks.length; i += 1) {
			const chunk = chunks[i];

			if (dryRun) {
				processed += chunk.length;

				console.log(
					JSON.stringify({
						day: day.format("YYYY-MM-DD"),
						chunk: i + 1,
						chunkSize: chunk.length,
						status: "dry-run",
					})
				);

				continue;
			}

			const result = await makeAttendancePresenceEstimateBatch({
				employeeDays: chunk,
			});

			processed += result.processed;
			upserted += result.upserted;

			console.log(
				JSON.stringify({
					day: day.format("YYYY-MM-DD"),
					chunk: i + 1,
					chunkSize: chunk.length,
					processed: result.processed,
					upserted: result.upserted,
					status: "done",
				})
			);
		}
	}

	console.log(
		JSON.stringify({
			job: "backfillPresenceEstimates",
			status: "complete",
			scannedDays,
			candidateEmployeeDays,
			processed,
			upserted,
			skippedExisting,
		})
	);
}

try {
	await main();
} catch (error) {
	console.error(
		JSON.stringify({
			job: "backfillPresenceEstimates",
			status: "failed",
			message: error.message,
			stack: error.stack,
		})
	);

	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}