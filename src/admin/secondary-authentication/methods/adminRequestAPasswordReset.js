import { PrismaClient } from "@prisma/client";
import { adminCreateOTP } from "../../otp/methods/adminCreateOTP.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";

const prisma = new PrismaClient();

export async function adminRequestAPasswordReset(email) {
	let db;
	try {
		if (!email) throw new Error("Email is required");

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const admin = await tx.admin.findUnique({
				where: { email },
			});

			if (!admin) throw new Error("No admin account with this email");

			const { otp, expiresAt } = await adminCreateOTP(
				email,
				"passwordReset"
			);

			await sendAdminMail({
				to: email,
				purpose: "passwordReset",
				payload: {
					otp,
					expiresAt: new Date(expiresAt).toLocaleTimeString(),
					subject: "Your Password Reset OTP",
				},
			});

			return {
				success: true,
				message: "Password reset OTP sent to email",
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminRequestAPasswordReset:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
