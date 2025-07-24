import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { employeeVerifyOTP } from "../../otp/methods/employeeVerifyOTP.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function employeeResetPassword(assignedEmail, otp, newPassword) {
	let db;

	try {
		if (!assignedEmail || !otp || !newPassword) {
			throw new Error("All fields are required");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const { employeeId } = await employeeVerifyOTP(assignedEmail, "passwordReset", otp);

			const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

			await tx.employee.update({
				where: { employeeId: employeeId },
				data: { password: hashed },
			});

			return {
				success: true,
				message: "Password reset successful",
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeResetPassword:", err);
		
		throw err;
	}
}
