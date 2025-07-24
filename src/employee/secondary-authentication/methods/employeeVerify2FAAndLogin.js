import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { createEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { employeeVerifyOTP } from "../../otp/methods/employeeVerifyOTP.js";

const prisma = new PrismaClient();

export async function employeeVerify2FAAndLogin(assignedEmail, password, otp) {
	let db;

	try {
		if (!assignedEmail || !password || !otp) {
			throw new Error("Email, password, and OTP are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const employee = await tx.employee.findUnique({
				where: { assignedEmail },
			});

			if (!employee) {
				throw new Error("Invalid credentials");
			}

			const isCorrect = await bcrypt.compare(password, employee.password);

			if (!isCorrect) {
				throw new Error("Invalid credentials");
			}

			const verified = await employeeVerifyOTP(
				assignedEmail,
				"twoFA",
				otp
			);

			const token = await createEmployeeJWT(verified.employeeId, {
				employeeId: verified.employeeId,
			});

			return { token };
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeVerify2FAAndLogin:", err);
		
		throw err;
	}
}
