import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { adminCreateOTP } from "../../otp/methods/adminCreateOTP.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";

const prisma = new PrismaClient();

export async function adminLogin({ email, password }) {
	let db;
	try {
		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const admin = await tx.admin.findUnique({
				where: { email },
			});

			if (!admin) throw new Error("Invalid credentials");

			const passwordMatch = await bcrypt.compare(
				password,
				admin.password
			);
			if (!passwordMatch) throw new Error("Invalid credentials");

			const settings = await tx.adminSettings.findFirst({
				where: { adminId: admin.id },
			});

			if (!settings) throw new Error("Admin settings not found");

			if (!settings.isTwoFA) {
				const token = await createAdminJWT(admin.id, {
					adminId: admin.id,
				});
				return { token };
			}

			const otpResult = await adminCreateOTP(email, "twoFA");

			await sendAdminMail({
				to: email,
				purpose: "twoFA",
				payload: {
					otp: otpResult.otp,
					expiresAt: new Date(
						otpResult.expiresAt
					).toLocaleTimeString(),
					subject: "Your 2FA OTP for Admin Login",
				},
			});

			return { requires2FA: true };
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminLogin:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}
