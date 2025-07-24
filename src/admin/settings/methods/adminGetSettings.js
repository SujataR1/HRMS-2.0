import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminGetSettings(authHeader) {
	let db;

	try {
		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const { adminId } = await verifyAdminJWT(authHeader);

			const settings = await tx.adminSettings.findFirst({
				where: { adminId },
			});

			if (!settings) throw new Error("Admin settings not found");

			return {
				isTwoFA: settings.isTwoFA,
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminGetSettings:", err);
		
		throw err;
	}
}
