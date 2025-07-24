import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminRevokeAllActiveSessions(authHeader, password) {
	let db;

	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}
		if (!password) throw new Error("Password is required");

		db = prisma;
		

		const result = await db.$transaction(
			async (tx) => {
				const { adminId } = await verifyAdminJWT(authHeader);

				const admin = await tx.admin.findUnique({
					where: { id: adminId },
				});

				if (!admin) throw new Error("Admin not found");

				const passwordMatch = await bcrypt.compare(
					password,
					admin.password
				);
				if (!passwordMatch) throw new Error("Incorrect password");

				await tx.adminActiveSessions.deleteMany({
					where: {
						adminId,
					},
				});

				return {
					success: true,
					message: "All sessions revoked",
				};
			},
			{ timeout: 30_000 }
		);

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminRevokeAllActiveSessions:", err);
		try {
			if (db) 
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
