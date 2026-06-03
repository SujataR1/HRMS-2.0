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

function readPositiveIntArg(name, fallback, { min = 1, max = 5000 } = {}) {
	const value = Number(readArg(name));

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

function readBooleanFlag(name) {
	return process.argv.includes(`--${name}`);
}

function buildDateWhere() {
	const from = readArg("from");
	const to = readArg("to");

	const attendanceDate = {};

	if (from) {
		const fromDay = dayjs.tz(from, TIMEZONE).startOf("day");

		if (!fromDay.isValid()) {
			throw new Error("--from must be a valid YYYY-MM-DD date");
		}

		attendanceDate.gte = fromDay.utc().toDate();
	}

	if (to) {
		const toDay = dayjs.tz(to, TIMEZONE).endOf("day");

		if (!toDay.isValid()) {
			throw new Error("--to must be a valid YYYY-MM-DD date");
		}

		attendanceDate.lte = toDay.utc().toDate();
	}

	if (!Object.keys(attendanceDate).length) return {};

	return { attendanceDate };
}

function attendanceDateToDayKey(attendanceDate) {
	return dayjs.utc(attendanceDate).format("YYYY-MM-DD");
}

async function backfillFromAttendanceLogs({
	batchSize,
	dryRun,
	dateWhere,
}) {
	let cursorId = null;

	let scanned = 0;
	let processed = 0;
	let upserted = 0;
	let batchNumber = 0;

	while (true) {
		const rows = await prisma.attendanceLog.findMany({
			where: dateWhere,
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
		scanned += rows.length;
		cursorId = rows.at(-1).id;

		const employeeDays = rows.map((row) => ({
			employeeId: row.employeeId,
			date: attendanceDateToDayKey(row.attendanceDate),
		}));

		if (dryRun) {
			processed += employeeDays.length;
			console.log(
				`[dry-run] batch=${batchNumber} employeeDays=${employeeDays.length}`
			);
			continue;
		}

		const result = await makeAttendancePresenceEstimateBatch({
			employeeDays,
		});

		processed += result.processed;
		upserted += result.upserted;

		console.log(
			`batch=${batchNumber} scanned=${rows.length} processed=${result.processed} upserted=${result.upserted}`
		);
	}

	return {
		scanned,
		processed,
		upserted,
	};
}

async function main() {
	const batchSize = readPositiveIntArg("batch-size", 500, {
		min: 1,
		max: 5000,
	});

	const dryRun = readBooleanFlag("dry-run");
	const dateWhere = buildDateWhere();

	console.log("Presence estimate backfill starting...");
	console.log({
		source: "attendanceLog",
		timezone: TIMEZONE,
		batchSize,
		dryRun,
		dateFilter: dateWhere.attendanceDate || null,
	});

	const result = await backfillFromAttendanceLogs({
		batchSize,
		dryRun,
		dateWhere,
	});

	console.log("Presence estimate backfill complete.");
	console.log(result);
}

try {
	await main();
} catch (error) {
	console.error("Presence estimate backfill failed:", error);
	process.exitCode = 1;
} finally {
	await prisma.$disconnect();
}