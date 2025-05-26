import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";

const prisma = new PrismaClient();

/**
 * Demotes (deletes) an HR account based on employeeId.
 * Requires valid admin JWT.
 *
 * @param {string} authHeader - Admin JWT header
 * @param {string} employeeId - The employeeId of the HR to demote
 */
export async function adminDemoteHR(authHeader, employeeId) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma.$extends({});
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const { adminId } = await verifyAdminJWT(authHeader);

			const admin = await tx.admin.findUnique({
				where: { id: adminId },
			});
			if (!admin) throw new Error("Admin not found");

			const hr = await tx.hR.findUnique({
				where: { employeeId },
			});
			if (!hr) throw new Error("HR account not found for this employee");

			await tx.hrActiveSessions.deleteMany({ where: { hrId: hr.id } });
			await tx.hrOTP.deleteMany({ where: { hrId: hr.id } });
			await tx.hR.delete({ where: { id: hr.id } });
			await tx.hrSettings.delete({ where: { hrId: hr.id } });
			await sendAdminMail({
				to: hr.email,
				purpose: "demoteHR",
				payload: {
					name: hr.name,
					subject: "HR Access Revoked",
				},
			});

			return {
				success: true,
				message: `HR account for employee (${employeeId}) has been demoted and deleted`,
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminDemoteHR:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
