import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { makeEmployeeAttendance } from "../../../biometric-access-machine/methods/makeEmployeeAttendance.js";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Generates or refreshes attendance for an authenticated employee.
 *
 * @param {object} params
 * @param {string} params.authHeader - Bearer token for employee
 * @param {string} [params.date] - Specific date (YYYY-MM-DD)
 * @param {string} [params.monthYear] - Format: MM-YYYY
 * @param {number} [params.year] - Four-digit year
 */
export async function employeeMakeOrRefreshAttendance({
	authHeader,
	date = null,
	monthYear = null,
	year = null,
} = {}) {
	try {
		if (!authHeader) throw new Error("Missing authorization header");

		const { employeeId } = await verifyEmployeeJWT(authHeader);

		const safeArgs = { employeeId };

		if (date) {
			safeArgs.date = dayjs.tz(date, TIMEZONE).format("YYYY-MM-DD");
		}
		if (monthYear) {
			safeArgs.monthYear = monthYear;
		}
		if (year) {
			safeArgs.year = year;
		}

		await makeEmployeeAttendance(safeArgs);

		return { success: true, message: "Attendance generation completed." };
	} catch (err) {
		console.error("💥 Failed to refresh employee attendance:", err);
		return {
			success: false,
			error: "Failed to refresh employee attendance.",
			detail: err.message,
		};
	}
}
