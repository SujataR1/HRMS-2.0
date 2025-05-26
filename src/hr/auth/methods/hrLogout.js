import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrLogout(authHeader = "") {
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		await verifyHrJWT(authHeader);

		const token = authHeader.split(" ")[1];

		const deleted = await prisma.hrActiveSessions.deleteMany({
			where: { token },
		});

		if (deleted.count === 0) {
			throw new Error("No active session found for this token");
		}

		return { success: true };
	} catch (err) {
		console.error("🔥 Error in hrLogout:", err);
		throw err;
	}
}
