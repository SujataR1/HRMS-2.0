import { prisma } from "#src/db/prisma.js";
import { deleteExpiredAdminTokens } from "#src/admin/admin-session-management/methods/adminSessionManagementMethods.js";
import { deleteExpiredHrTokens } from "#src/hr/hr-session-management/methods/hrSessionManagementMethods.js";
import { deleteExpiredEmployeeTokens } from "#src/employee/employee-session-management/methods/employeeSessionManagementMethods.js";

export async function cleanupExpiredSessions() {
	return await prisma.$transaction(async (tx) => {
		const [adminResult, hrResult, employeeResult] = await Promise.all([
			deleteExpiredAdminTokens(tx),
			deleteExpiredHrTokens(tx),
			deleteExpiredEmployeeTokens(tx),
		]);

		return {
			adminDeleted: adminResult.count,
			hrDeleted: hrResult.count,
			employeeDeleted: employeeResult.count,
		};
	});
}