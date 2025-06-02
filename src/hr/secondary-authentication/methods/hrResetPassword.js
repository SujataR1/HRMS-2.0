import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { hrVerifyOTP } from "../../otp/methods/hrVerifyOTP.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function hrResetPassword(email, otp, newPassword) {
	let db;

	try {
		if (!email || !otp || !newPassword) {
			throw new Error("Email, OTP, and new password are required");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const verifyResult = await hrVerifyOTP(email, "passwordReset", otp);

			const hrId = verifyResult.hrId;

			const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

			await tx.hr.update({
				where: { id: hrId },
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
		console.error("🔥 Error in hrResetPassword:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
