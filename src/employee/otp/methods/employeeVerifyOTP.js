import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function employeeVerifyOTP(assignedEmail, purpose, otp) {
	let db;

	try {
		if (!assignedEmail || !purpose || !otp) {
			throw new Error("Email, purpose, and OTP are required");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const employee = await tx.employee.findUnique({
				where: { assignedEmail },
			});

			if (!employee) {
				throw new Error("Employee not found");
			}

			// Clean expired OTPs
			await tx.employeeOTP.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});

			const match = await tx.employeeOTP.findFirst({
				where: {
					employeeId: employee.employeeId,
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

			await tx.employeeOTP.delete({
				where: { id: match.id },
			});

			return {
				success: true,
				employeeId: employee.employeeId,
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeVerifyOTP:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
