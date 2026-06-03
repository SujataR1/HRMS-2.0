import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { makeEmployeeAttendanceBatch } from "./makeEmployeeAttendanceBatch.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Persist biometric punches and trigger attendance rebuilds.
 *
 * Raw biometric logs are punch-level facts.
 * Attendance rows are employee-day derived facts.
 *
 * punchState is nullable for back-compat:
 *   null = old/unmarked payload or unavailable direction
 *   in   = entry / punch code 0
 *   out  = exit / punch code 1
 *
 * @param {Array<{
 *   employeeId: string,
 *   timestamp: string,
 *   identifier: string,
 *   punchState?: "in" | "out" | null
 * }>} logs
 */
export async function insertBiometricLogs(logs = []) {
	if (!Array.isArray(logs) || logs.length === 0) {
		throw new Error("Logs must be a non-empty array");
	}

	try {
		await prisma.biometricLog.createMany({
			data: logs.map(({ employeeId, timestamp, identifier, punchState = null }) => ({
				employeeId,
				timestamp: dayjs.tz(timestamp, TIMEZONE).toDate(),
				identifier,
				punchState: punchState ?? null,
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

		await makeEmployeeAttendanceBatch({
			employeeDays: Array.from(affectedEmployeeDays.values()),
		});
	} catch (err) {
		console.error("🔥 insertBiometricLogs failed:", err);
		throw err;
	}
}