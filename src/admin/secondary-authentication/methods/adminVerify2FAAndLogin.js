import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { adminVerifyOTP } from "../../otp/methods/adminVerifyOTP.js";

const prisma = new PrismaClient();

export async function adminVerify2FAAndLogin(email, password, otp) {
	let db;

	try {
		if (!email || !password || !otp) {
			throw new Error("Email, password, and OTP are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const admin = await tx.admin.findUnique({
				where: { email },
			});

			if (!admin) throw new Error("Invalid credentials");

			const passwordMatch = await bcrypt.compare(
				password,
				admin.password
			);
			if (!passwordMatch) throw new Error("Invalid credentials");

			const verifyResult = await adminVerifyOTP(email, "twoFA", otp);

			const adminId = verifyResult.adminId;

			const token = await createAdminJWT(adminId, { adminId });

			return { token };
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminVerify2FAAndLogin:", err);
		
		throw err;
	}
}
