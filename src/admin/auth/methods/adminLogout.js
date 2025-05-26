import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminLogout(authHeader = "") {
	try {
		await verifyAdminJWT(authHeader);

		const token = authHeader.split(" ")[1];

		const deleted = await prisma.adminActiveSessions.deleteMany({
			where: {
				token,
			},
		});

		if (deleted.count === 0) {
			throw new Error("No active session found for this token");
		}

		return { success: true };
	} catch (err) {
		console.error("🔥 Error in adminLogout:", err);
		throw err;
	}
}
