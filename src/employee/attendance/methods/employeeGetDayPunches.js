import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { getEmployeeDayPunches } from "#src/attendance-punches/methods/getEmployeeDayPunches.js";

/**
 * Get raw punch timeline for the currently logged-in employee for one day.
 *
 * @param {Object} params
 * @param {string} params.authHeader - "Bearer <token>"
 * @param {string} params.date       - YYYY-MM-DD
 */
export async function employeeGetDayPunches({ authHeader, date }) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	let session;

	try {
		session = await verifyEmployeeJWT(authHeader);
	} catch {
		throw new Error("Invalid or expired token");
	}

	return await getEmployeeDayPunches({
		employeeId: session.employeeId,
		date,
	});
}