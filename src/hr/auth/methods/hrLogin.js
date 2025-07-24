import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import { sendHrMail } from "../../mailer/methods/hrMailer.js";
import { hrCreateOTP } from "../../otp/methods/hrCreateOTP.js";

const prisma = new PrismaClient();

export async function hrLogin({ email, password }) {
	let db;
	try {
		if (!email || !password) {
			throw new Error("Email and password are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const hr = await tx.hr.findUnique({
				where: { email },
			});
			if (!hr) throw new Error("Invalid credentials");

			const passwordMatch = await bcrypt.compare(password, hr.password);
			if (!passwordMatch) throw new Error("Invalid credentials");

			const settings = await tx.hrSettings.findFirst({
				where: { HrId: hr.id },
			});
			if (!settings) throw new Error("HR settings not found");

			if (!settings.isTwoFA) {
				const token = await createHrJWT(hr.id, { hrId: hr.id });
				return { token };
			}

			const otpResult = await hrCreateOTP(email, "twoFA");

			await sendHrMail({
				to: email,
				purpose: "twoFA",
				payload: {
					otp: otpResult.otp,
					expiresAt: new Date(
						otpResult.expiresAt
					).toLocaleTimeString(),
					subject: "Your 2FA OTP for HR Login",
				},
			});

			return { requires2FA: true };
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrLogin:", err);
		
		throw err;
	}
}
