import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { auditor } from "../../../utils/logging/methods/auditor.js";
import { createAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";
import { adminCreateOTP } from "../../otp/methods/adminCreateOTP.js";

const prisma = new PrismaClient();

export async function adminLogin({ email, password }, meta = {}) {
	let db;
	try {
		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const admin = await tx.admin.findUnique({
				where: { email },
			});

			if (!admin) {
				auditor({
					actorRole: "unauthenticated",
					actorId: null,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/admin/login",
					action: "login",
					status: "failure",
					message: `Login attempt failed for non-existent email: ${email}`,
				});
				throw new Error("Invalid credentials");
			}

			const passwordMatch = await bcrypt.compare(
				password,
				admin.password
			);
			if (!passwordMatch) {
				auditor({
					actorRole: "admin",
					actorId: admin.id,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/admin/login",
					action: "login",
					status: "failure",
					message: "Wrong password",
				});
				throw new Error("Invalid credentials");
			}

			const settings = await tx.adminSettings.findFirst({
				where: { adminId: admin.id },
			});

			if (!settings) throw new Error("Admin settings not found");

			// If 2FA disabled, log success and return token
			if (!settings.isTwoFA) {
				const token = await createAdminJWT(admin.id, {
					adminId: admin.id,
				});

				auditor({
					actorRole: "admin",
					actorId: admin.id,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/admin/login",
					action: "login",
					status: "success",
					message: "Login successful",
				});

				return { token };
			}

			// 2FA enabled → Generate OTP and notify
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

			auditor({
				actorRole: "admin",
				actorId: admin.id,
				ipAddress: meta.ip,
				userAgent: meta.ua,
				referrer: meta.ref,
				endpoint: "/admin/login",
				action: "login",
				status: "success",
				message: "OTP generated and email sent",
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
