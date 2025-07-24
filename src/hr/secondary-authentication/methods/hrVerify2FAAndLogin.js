import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import { hrVerifyOTP } from "../../otp/methods/hrVerifyOTP.js";

const prisma = new PrismaClient();

export async function hrVerify2FAAndLogin(email, password, otp) {
	let db;

	try {
		if (!email || !password || !otp) {
			throw new Error("Email, password, and OTP are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const hr = await tx.hr.findUnique({
				where: { email },
			});

			if (!hr) throw new Error("Invalid credentials");

			const passwordMatch = await bcrypt.compare(password, hr.password);
			if (!passwordMatch) throw new Error("Invalid credentials");

			const verifyResult = await hrVerifyOTP(email, "twoFA", otp);

			const hrId = verifyResult.hrId;

			const token = await createHrJWT(hrId, { hrId });

			return { token };
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrVerify2FAAndLogin:", err);
		try {
			if (db) 
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
