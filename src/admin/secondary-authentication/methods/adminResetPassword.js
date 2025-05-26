import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { adminVerifyOTP } from "../../otp/methods/adminVerifyOTP.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function adminResetPassword(email, otp, newPassword) {
	let db;

	try {
		if (!email || !otp || !newPassword) {
			throw new Error("Email, OTP, and new password are required");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const verifyResult = await adminVerifyOTP(
				email,
				"passwordReset",
				otp
			);

			const adminId = verifyResult.adminId;

			const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

			const updated = await tx.admin.update({
				where: { id: adminId },
				data: { password: hashed },
			});

			return {
				success: true,
				message: "Password updated successfully",
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminResetPassword:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
