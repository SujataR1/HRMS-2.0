import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function adminChangePassword(
	authHeader,
	oldPassword,
	newPassword
) {
	let db;
	try {
		if (!authHeader || !oldPassword || !newPassword) {
			throw new Error(
				"Authorization, old password, and new password are required"
			);
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(
			async (tx) => {
				const { adminId } = await verifyAdminJWT(authHeader);

				const admin = await tx.admin.findUnique({
					where: { id: adminId },
				});

				if (!admin) throw new Error("Admin not found");

				const passwordMatch = await bcrypt.compare(
					oldPassword,
					admin.password
				);
				if (!passwordMatch)
					throw new Error("Old password is incorrect");

				const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

				await tx.admin.update({
					where: { id: adminId },
					data: {
						password: hashed,
					},
				});

				return {
					success: true,
					message: "Password changed successfully",
				};
			},
			{ timeout: 30_000 }
		);

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminChangePassword:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
