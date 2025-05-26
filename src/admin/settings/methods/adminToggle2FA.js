import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminToggle2FA(authHeader) {
	let db;
	try {
		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const { adminId } = await verifyAdminJWT(authHeader);

			const admin = await tx.admin.findUnique({
				where: { id: adminId },
			});

			if (!admin) throw new Error("Admin not found");

			const currentSetting = await tx.adminSettings.findFirst({
				where: { adminId },
			});

			if (!currentSetting) throw new Error("AdminSettings not found");

			if (!admin.isEmailVerified && !currentSetting.isTwoFA) {
				throw new Error("Email must be verified to enable 2FA");
			}

			const updated = await tx.adminSettings.updateMany({
				where: { adminId },
				data: {
					isTwoFA: !currentSetting.isTwoFA,
				},
			});

			if (updated.count === 0) {
				throw new Error("Failed to update 2FA setting");
			}

			return {
				success: true,
				isTwoFA: !currentSetting.isTwoFA,
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminToggle2FA:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
