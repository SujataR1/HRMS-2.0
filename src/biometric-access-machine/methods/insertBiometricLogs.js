import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { makeEmployeeAttendance } from "./makeEmployeeAttendance.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Persist biometric punches and trigger attendance rebuilds.
 *
 * Raw biometric logs are punch-level facts.
 * Attendance rows are employee-day derived facts.
 *
 * So after inserting raw punches, recompute each affected employee-day once.
 *
 * @param {Array<{ employeeId: string, timestamp: string, identifier: string }>} logs
 */
export async function insertBiometricLogs(logs = []) {
	if (!Array.isArray(logs) || logs.length === 0) {
		throw new Error("Logs must be a non-empty array");
	}

	try {
		await prisma.biometricLog.createMany({
			data: logs.map(({ employeeId, timestamp, identifier }) => ({
				employeeId,
				timestamp: dayjs.tz(timestamp, TIMEZONE).toDate(),
				identifier,
			})),
			skipDuplicates: true,
		});

		const affectedEmployeeDays = new Map();

		for (const { employeeId, timestamp } of logs) {
			const dayKey = dayjs.tz(timestamp, TIMEZONE).format("YYYY-MM-DD");
			const affectedKey = `${employeeId}_${dayKey}`;

			if (!affectedEmployeeDays.has(affectedKey)) {
				affectedEmployeeDays.set(affectedKey, {
					employeeId,
					date: dayKey,
				});
			}
		}

		await Promise.allSettled(
			Array.from(affectedEmployeeDays.values()).map(({ employeeId, date }) =>
				makeEmployeeAttendance({
					employeeId,
					date,
				})
			)
		);
	} catch (err) {
		console.error("🔥 insertBiometricLogs failed:", err);
		throw err;
	}
}