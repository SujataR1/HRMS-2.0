import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminVerifyOTP(email, purpose, otp) {
	let db;

	try {
		if (!email || !purpose || !otp) {
			throw new Error("Email, purpose, and OTP are required");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const admin = await tx.admin.findUnique({
				where: { email },
			});

			if (!admin) {
				throw new Error("Admin not found");
			}

			await tx.adminOTP.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});

			const match = await tx.adminOTP.findFirst({
				where: {
					adminId: admin.id,
					purpose,
					otp,
					expiresAt: {
						gt: new Date(),
					},
				},
			});

			if (!match) {
				throw new Error("Invalid or expired OTP");
			}

			await tx.adminOTP.delete({
				where: { id: match.id },
			});

			return {
				success: true,
				adminId: admin.id,
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminVerifyOTP:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
