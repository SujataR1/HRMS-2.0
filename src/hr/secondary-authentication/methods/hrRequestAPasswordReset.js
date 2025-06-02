import { PrismaClient } from "@prisma/client";
import { sendHrMail } from "../../mailer/methods/hrMailer.js";
import { hrCreateOTP } from "../../otp/methods/hrCreateOTP.js";

const prisma = new PrismaClient();

export async function hrRequestAPasswordReset(email) {
	let db;
	try {
		if (!email) throw new Error("Email is required");

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const hr = await tx.hr.findUnique({
				where: { email },
			});

			if (!hr) throw new Error("No HR account with this email");

			const { otp, expiresAt } = await hrCreateOTP(
				email,
				"passwordReset"
			);

			await sendHrMail({
				to: email,
				purpose: "passwordReset",
				payload: {
					otp,
					expiresAt: new Date(expiresAt).toLocaleTimeString(),
					subject: "Your HR Password Reset OTP",
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
		console.error("🔥 Error in hrRequestAPasswordReset:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
