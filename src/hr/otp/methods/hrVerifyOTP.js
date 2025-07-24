import { PrismaClient } from "@prisma/client";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);


const prisma = new PrismaClient();

export async function hrVerifyOTP(email, purpose, otp) {
	let db;

	try {
		if (!email || !purpose || !otp) {
			throw new Error("Email, purpose, and OTP are required");
		}

		db = prisma;
		

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

			const serverTz = process.env.TIMEZONE || 'UTC';
			const now = dayjs().tz(serverTz).toDate();

			const match = await tx.hrOTP.findFirst({
				where: {
					hrId: hr.id,
					purpose,
					otp,
					expiresAt: {
						gt: now,
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

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrVerifyOTP:", err);
		throw err;
	}
}
