import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import { getEmployeeDayPunches } from "#src/attendance-punches/methods/getEmployeeDayPunches.js";

/**
 * Get raw punch timeline for a specific employee-day.
 *
 * @param {Object} params
 * @param {string} params.authHeader - "Bearer <token>"
 * @param {string} params.employeeId
 * @param {string} params.date       - YYYY-MM-DD
 */
export async function hrGetEmployeeDayPunches({ authHeader, employeeId, date }) {
	if (!authHeader) {
		throw new Error("Missing authorization token");
	}

	if (!employeeId) {
		throw new Error("employeeId is required");
	}

	try {
		await verifyHrJWT(authHeader);
	} catch {
		throw new Error("Invalid or expired HR token");
	}

	return await getEmployeeDayPunches({
		employeeId,
		date,
	});
}