import { prisma } from "#src/db/prisma.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";
import { adminCreateOTP } from "../../otp/methods/adminCreateOTP.js";
export async function adminRequestAPasswordReset(email) {
	let db;
	try {
		if (!email) throw new Error("Email is required");

		db = prisma;
		

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

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminRequestAPasswordReset:", err);
		
		throw err;
	}
}
