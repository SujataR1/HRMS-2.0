// src/admin/employee/methods/hrGetAllHREmployeeIDs.js
import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Get all HR employees (based on Hr model) with core identity from Employee table
 * Returns: employeeId, assignedEmail, name
 * Auth: Admin-only (Bearer token)
 */
export async function adminGetAllHRs(authHeader) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma;

		const result = await db.$transaction(async (tx) => {
			const { adminId } = await verifyAdminJWT(authHeader);

			const admin = await tx.admin.findUnique({
				where: { id: adminId },
			});
			if (!admin) throw new Error("Admin not found");

			// Source of truth: Hr.employeeId list (who is HR)
			const hrRows = await tx.hr.findMany({
				select: { employeeId: true },
				orderBy: { employeeId: "asc" },
			});

			const hrEmployeeIds = hrRows
				.map((h) => h.employeeId)
				.filter(Boolean);

			if (!hrEmployeeIds.length) {
				return {
					success: true,
					message: "No HR employees found",
					data: {
						employees: [],
						count: 0,
					},
				};
			}

			// Identity truth: Employee table
			const employees = await tx.employee.findMany({
				where: { employeeId: { in: hrEmployeeIds } },
				select: {
					employeeId: true,
					assignedEmail: true,
					name: true,
				},
				orderBy: { employeeId: "asc" },
			});

			return {
				success: true,
				message: "HR employees fetched successfully",
				data: {
					employees,
					count: employees.length,
				},
			};
		});

		return result;
	} catch (err) {
		console.error("🔥 Error in hrGetAllHREmployeeIDs:", err);
		throw err;
	}
}