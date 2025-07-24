import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export async function employeeCreateOTP(assignedEmail, purpose) {
	let db;

	try {
		if (!assignedEmail || !purpose) {
			throw new Error("Email and purpose are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const employee = await tx.employee.findUnique({
				where: { assignedEmail },
			});

			if (!employee) {
				throw new Error("Employee not found with this email");
			}

			await tx.employeeOTP.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});

			const existing = await tx.employeeOTP.findFirst({
				where: {
					employeeId: employee.employeeId,
					purpose,
					expiresAt: {
						gt: new Date(),
					},
				},
			});

			if (existing) {
				return {
					success: true,
					otp: existing.otp,
					expiresAt: existing.expiresAt,
					reused: true,
				};
			}

			const otp = Math.floor(100000 + Math.random() * 900000).toString();
			const expiresAt = dayjs().add(10, "minutes").toDate();

			await tx.employeeOTP.create({
				data: {
					employeeId: employee.employeeId,
					otp,
					purpose,
					expiresAt,
				},
			});

			return {
				success: true,
				otp,
				expiresAt,
				reused: false,
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeCreateOTP:", err);
		
		throw err;
	}
}
