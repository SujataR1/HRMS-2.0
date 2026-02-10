import { sendHrMail } from "../../mailer/methods/hrMailer.js";
import { hrCreateOTP } from "./hrCreateOTP.js";

export async function hrResendOTP({ email }) {
	try {
		if (!email) throw new Error("Email is required");

		// ✅ Existence / permission / idempotency are handled inside hrCreateOTP
		const otpResult = await hrCreateOTP(email, "twoFA");

		await sendHrMail({
			to: email,
			purpose: "twoFA",
			payload: {
				otp: otpResult.otp,
				expiresAt: new Date(otpResult.expiresAt).toLocaleTimeString(),
				subject: "Your 2FA OTP for HR Login",
			},
		});

		return { requires2FA: true };
	} catch (err) {
		console.error("🔥 Error in hrResendOTP:", err);
		throw err;
	}
}