import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { adminCreateOTP } from "../../otp/methods/adminCreateOTP.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";

const prisma = new PrismaClient();

export async function adminRequestEmailVerification(authHeader) {
	let db;

	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Invalid authorization header");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(
			async (tx) => {
				const { adminId } = await verifyAdminJWT(authHeader);

				const admin = await tx.admin.findUnique({
					where: { id: adminId },
				});

				if (!admin) throw new Error("Admin not found");

				const { otp, expiresAt } = await adminCreateOTP(
					admin.email,
					"emailVerification"
				);

				await sendAdminMail({
					to: admin.email,
					purpose: "emailVerification",
					payload: {
						otp,
						expiresAt: new Date(expiresAt).toLocaleTimeString(),
						subject: "Verify Your Email - OTP Inside",
					},
				});

				return {
					success: true,
					message: "Verification OTP sent to your email",
				};
			},
			{ timeout: 30_000 }
		);

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminRequestEmailVerification:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
