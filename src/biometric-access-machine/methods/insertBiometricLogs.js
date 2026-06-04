import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { makeEmployeeAttendanceBatch } from "./makeEmployeeAttendanceBatch.js";
import { makeAttendancePresenceEstimateBatch } from "#src/attendance-presence-estimates/methods/makeAttendancePresenceEstimateBatch.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

function normalizePunchState(value) {
	if (value === "in") return "in";
	if (value === "out") return "out";

	return null;
}

function buildAffectedEmployeeDays(logs) {
	const affectedEmployeeDays = new Map();

	for (const { employeeId, timestamp } of logs) {
		const cleanEmployeeId = String(employeeId || "").trim();

		if (!cleanEmployeeId || !timestamp) continue;

		const dayKey = dayjs.tz(timestamp, TIMEZONE).format("YYYY-MM-DD");
		const affectedKey = `${cleanEmployeeId}_${dayKey}`;

		if (!affectedEmployeeDays.has(affectedKey)) {
			affectedEmployeeDays.set(affectedKey, {
				employeeId: cleanEmployeeId,
				date: dayKey,
			});
		}
	}

	return Array.from(affectedEmployeeDays.values());
}

/**
 * Persist biometric punches and trigger derived rebuilds.
 *
 * Raw biometric logs are punch-level facts.
 *
 * After inserting raw punches, recompute each affected employee-day for:
 * 1. AttendanceLog
 * 2. Presence/break state
 *
 * Presence must be derived from BiometricLog directly, not from AttendanceLog.
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

	const normalizedLogs = logs
		.map((log) => ({
			employeeId: String(log.employeeId || "").trim(),
			timestamp: log.timestamp,
			identifier: log.identifier || "unknown",
			punchState: normalizePunchState(log.punchState),
		}))
		.filter((log) => log.employeeId && log.timestamp);

	if (!normalizedLogs.length) {
		throw new Error("No valid biometric logs to insert");
	}

	try {
		await prisma.biometricLog.createMany({
			data: normalizedLogs.map(
				({ employeeId, timestamp, identifier, punchState }) => ({
					employeeId,
					timestamp: dayjs.tz(timestamp, TIMEZONE).toDate(),
					identifier,
					punchState,
				})
			),
			skipDuplicates: true,
		});

		const affectedEmployeeDays = buildAffectedEmployeeDays(normalizedLogs);

		if (!affectedEmployeeDays.length) {
			return {
				insertedInputCount: normalizedLogs.length,
				affectedEmployeeDays: 0,
				attendance: {
					processed: 0,
					upserted: 0,
				},
				presence: {
					processed: 0,
					upserted: 0,
				},
			};
		}

		const [attendanceResult, presenceResult] = await Promise.all([
			makeEmployeeAttendanceBatch({
				employeeDays: affectedEmployeeDays,
			}),

			makeAttendancePresenceEstimateBatch({
				employeeDays: affectedEmployeeDays,
			}),
		]);

		return {
			insertedInputCount: normalizedLogs.length,
			affectedEmployeeDays: affectedEmployeeDays.length,
			attendance: attendanceResult,
			presence: presenceResult,
		};
	} catch (err) {
		console.error("🔥 insertBiometricLogs failed:", err);
		throw err;
	}
}