import { prisma } from "#src/db/prisma.js";
import { deleteExpiredAdminTokens } from "#src/admin/admin-session-management/methods/adminSessionManagementMethods.js";
import { deleteExpiredHrTokens } from "#src/hr/hr-session-management/methods/hrSessionManagementMethods.js";
import { deleteExpiredEmployeeTokens } from "#src/employee/employee-session-management/methods/employeeSessionManagementMethods.js";

export async function cleanupExpiredSessions() {
	return await prisma.$transaction(async (tx) => {
		const adminResult = await deleteExpiredAdminTokens(tx);
		const hrResult = await deleteExpiredHrTokens(tx);
		const employeeResult = await deleteExpiredEmployeeTokens(tx);

		const adminDeleted = adminResult.count;
		const hrDeleted = hrResult.count;
		const employeeDeleted = employeeResult.count;

		return {
			adminDeleted,
			hrDeleted,
			employeeDeleted,
			totalDeleted: adminDeleted + hrDeleted + employeeDeleted,
			cleanedAt: new Date().toISOString(),
		};
	});
}