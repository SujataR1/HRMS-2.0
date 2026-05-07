import { prisma } from "#src/db/prisma.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
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
