import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export async function hrCreateOTP(email, purpose) {
	let db;

	try {
		if (!email || !purpose) {
			throw new Error("Email and purpose are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const hr = await tx.hr.findUnique({
				where: { email },
			});

			if (!hr) {
				throw new Error("HR not found with this email");
			}

			await tx.hrOTP.deleteMany({
				where: {
					expiresAt: {
						lt: new Date(),
					},
				},
			});

			const existing = await tx.hrOTP.findFirst({
				where: {
					hrId: hr.id,
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

			const created = await tx.hrOTP.create({
				data: {
					hrId: hr.id,
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
		console.error("🔥 Error in hrCreateOTP:", err);
		
		throw err;
	}
}
