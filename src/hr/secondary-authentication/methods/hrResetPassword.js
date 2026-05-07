import { prisma } from "#src/db/prisma.js";
import bcrypt from "bcrypt";
import { hrVerifyOTP } from "../../otp/methods/hrVerifyOTP.js";
const SALT_ROUNDS = 10;

export async function hrResetPassword(email, otp, newPassword) {
	let db;

	try {
		if (!email || !otp || !newPassword) {
			throw new Error("Email, OTP, and new password are required");
		}

		db = prisma;
		

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

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrResetPassword:", err);
		
		throw err;
	}
}
