import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function hrVerifyOTP(email, purpose, otp) {
	let db;

	try {
		if (!email || !purpose || !otp) {
			throw new Error("Email, purpose, and OTP are required");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const hr = await tx.hr.findUnique({
				where: { email },
			});

			if (!hr) {
				throw new Error("HR not found");
			}

			await tx.hrOTP.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});

			const match = await tx.hrOTP.findFirst({
				where: {
					hrId: hr.id,
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

			await tx.hrOTP.delete({
				where: { id: match.id },
			});

			return {
				success: true,
				hrId: hr.id,
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in hrVerifyOTP:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
