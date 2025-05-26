import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { adminVerifyOTP } from "../../otp/methods/adminVerifyOTP.js";

const prisma = new PrismaClient();

export async function adminVerifyEmail(authHeader, otp) {
	let db;

	try {
		if (!authHeader || !otp) {
			throw new Error("Authorization and OTP are required");
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

				await adminVerifyOTP(admin.email, "emailVerification", otp);

				await tx.admin.update({
					where: { id: adminId },
					data: {
						isEmailVerified: true,
					},
				});

				return {
					success: true,
					message: "Email successfully verified",
				};
			},
			{ timeout: 30_000 }
		);

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminVerifyEmail:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
