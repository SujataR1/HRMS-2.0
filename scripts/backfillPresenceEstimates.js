import "dotenv/config";
import { prisma } from "#src/db/prisma.js";
import { makeAttendancePresenceEstimateBatch } from "#src/attendance-presence-estimates/methods/makeAttendancePresenceEstimateBatch.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

function readArg(name, fallback = null) {
	const prefix = `--${name}=`;
	const found = process.argv.find((arg) => arg.startsWith(prefix));

	if (!found) return fallback;

	return found.slice(prefix.length);
}

function readBooleanFlag(name) {
	return process.argv.includes(`--${name}`);
}

function readPositiveIntArg(name, fallback, { min = 1, max = 5000 } = {}) {
	const raw = readArg(name);
	const value = Number(raw);

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

function parseLocalDateArg(name) {
	const value = readArg(name);

	if (!value) return null;

	const parsed = dayjs.tz(value, TIMEZONE);

	if (!parsed.isValid()) {
		throw new Error(`--${name} must be a valid date in YYYY-MM-DD format`);
	}

	return parsed;
}

function buildAttendanceDateWhere() {
	const from = parseLocalDateArg("from");
	const to = parseLocalDateArg("to");
	const employeeId = readArg("employee-id");

	const where = {};

	if (employeeId) {
		where.employeeId = employeeId;
	}

	if (from || to) {
		where.attendanceDate = {};

		if (from) {
			where.attendanceDate.gte = from.startOf("day").utc().toDate();
		}

		if (to) {
			where.attendanceDate.lte = to.endOf("day").utc().toDate();
		}
	}

	return where;
}

function attendanceDateToDayKey(attendanceDate) {
	return dayjs.utc(attendanceDate).tz(TIMEZONE).format("YYYY-MM-DD");
}

function uniqueEmployeeDaysFromAttendanceRows(rows) {
	const map = new Map();

	for (const row of rows) {
		const dayKey = attendanceDateToDayKey(row.attendanceDate);
		const key = `${row.employeeId}_${dayKey}`;

		if (!map.has(key)) {
			map.set(key, {
				employeeId: row.employeeId,
				date: dayKey,
			});
		}
	}

	return Array.from(map.values());
}

async function countCandidateAttendanceRows(where) {
	return await prisma.attendanceLog.count({ where });
}

async function backfillPresenceEstimates({
	where,
	batchSize,
	dryRun,
	onlyMissing,
}) {
	let cursorId = null;

	let scannedRows = 0;
	let candidateEmployeeDays = 0;
	let processed = 0;
	let upserted = 0;
	let skippedExisting = 0;
	let batchNumber = 0;

	while (true) {
		const rows = await prisma.attendanceLog.findMany({
			where,
			select: {
				id: true,
				employeeId: true,
				attendanceDate: true,
			},
			orderBy: {
				id: "asc",
			},
			take: batchSize,
			...(cursorId
				? {
						cursor: {
							id: cursorId,
						},
						skip: 1,
					}
				: {}),
		});

		if (!rows.length) break;

		batchNumber += 1;
		scannedRows += rows.length;
		cursorId = rows.at(-1).id;

		let employeeDays = uniqueEmployeeDaysFromAttendanceRows(rows);
		candidateEmployeeDays += employeeDays.length;

		if (onlyMissing && employeeDays.length) {
			const employeeIds = Array.from(
				new Set(employeeDays.map((item) => item.employeeId))
			);

			const dates = employeeDays.map((item) =>
				dayjs.tz(item.date, TIMEZONE).startOf("day").utc().toDate()
			);

			const existingEstimates =
				await prisma.attendancePresenceEstimate.findMany({
					where: {
						employeeId: {
							in: employeeIds,
						},
						attendanceDate: {
							in: dates,
						},
					},
					select: {
						employeeId: true,
						attendanceDate: true,
					},
				});

			const existingKeys = new Set(
				existingEstimates.map((estimate) => {
					const dayKey = attendanceDateToDayKey(
						estimate.attendanceDate
					);

					return `${estimate.employeeId}_${dayKey}`;
				})
			);

			const beforeFilterCount = employeeDays.length;

			employeeDays = employeeDays.filter((item) => {
				const key = `${item.employeeId}_${item.date}`;
				return !existingKeys.has(key);
			});

			skippedExisting += beforeFilterCount - employeeDays.length;
		}

		if (dryRun) {
			processed += employeeDays.length;

			console.log(
				JSON.stringify({
					mode: "dry-run",
					batch: batchNumber,
					scannedRows: rows.length,
					employeeDays: employeeDays.length,
					skippedExisting,
				})
			);

			continue;
		}

		if (!employeeDays.length) {
			console.log(
				JSON.stringify({
					mode: "write",
					batch: batchNumber,
					scannedRows: rows.length,
					employeeDays: 0,
					upserted: 0,
					skippedExisting,
				})
			);

			continue;
		}

		const result = await makeAttendancePresenceEstimateBatch({
			employeeDays,
		});

		processed += result.processed;
		upserted += result.upserted;

		console.log(
			JSON.stringify({
				mode: "write",
				batch: batchNumber,
				scannedRows: rows.length,
				employeeDays: employeeDays.length,
				processed: result.processed,
				upserted: result.upserted,
				skippedExisting,
			})
		);
	}

	return {
		scannedRows,
		candidateEmployeeDays,
		processed,
		upserted,
		skippedExisting,
	};
}

async function main() {
	const batchSize = readPositiveIntArg("batch-size", 500, {
		min: 1,
		max: 5000,
	});

	const dryRun = readBooleanFlag("dry-run");
	const onlyMissing = readBooleanFlag("only-missing");
	const where = buildAttendanceDateWhere();

	console.log(
		JSON.stringify({
			job: "backfillPresenceEstimates",
			source: "AttendanceLog",
			timezone: TIMEZONE,
			batchSize,
			dryRun,
			onlyMissing,
			filter: where,
		})
	);

	const candidateRows = await countCandidateAttendanceRows(where);

	console.log(
		JSON.stringify({
			candidateAttendanceRows: candidateRows,
		})
	);

	const result = await backfillPresenceEstimates({
		where,
		batchSize,
		dryRun,
		onlyMissing,
	});

	console.log(
		JSON.stringify({
			job: "backfillPresenceEstimates",
			status: "complete",
			...result,
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