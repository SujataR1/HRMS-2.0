import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { makeEmployeeAttendance } from "./makeEmployeeAttendance.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const IST = process.env.TIMEZONE || "Asia/Kolkata";

export async function insertBiometricLogs(logs = []) {
	if (!Array.isArray(logs) || logs.length === 0) {
		throw new Error("Logs must be a non-empty array");
	}

	try {
		await prisma.biometricLog.createMany({
			data: logs.map(({ employeeId, timestamp, identifier }) => ({
				employeeId,
				timestamp: dayjs.tz(timestamp, IST).toDate(), // ✅ IST to UTC
				identifier,
			})),
			skipDuplicates: true,
		});

		const affectedDates = Array.from(
			new Set(
				logs.map((log) =>
					dayjs
						.tz(log.timestamp, IST) // ✅ Parse as IST
						.startOf("day")
						.format("YYYY-MM-DD")
				)
			)
		);

		await Promise.allSettled(
			affectedDates.map((dateStr) =>
				makeEmployeeAttendance({
					employeeId: employeeId, 
					date: new Date(`${dateStr}T00:00:00.000+05:30`),
				})
			)
		);
	} catch (err) {
		console.error("🔥 Transaction failed:", err);
		throw err;
	}
}

