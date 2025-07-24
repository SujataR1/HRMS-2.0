import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export async function adminCreateOTP(email, purpose) {
	let db;

	try {
		if (!email || !purpose) {
			throw new Error("Email and purpose are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const admin = await tx.admin.findUnique({
				where: { email },
			});

			if (!admin) {
				throw new Error("Admin not found with this email");
			}

			await tx.adminOTP.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});

			const existing = await tx.adminOTP.findFirst({
				where: {
					adminId: admin.id,
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

			const created = await tx.adminOTP.create({
				data: {
					adminId: admin.id,
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
		console.error("🔥 Error in adminCreateOTP:", err);
		
		throw err;
	}
}
