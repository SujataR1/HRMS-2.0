import { PrismaClient } from "@prisma/client";
import { employeeCreateOTP } from "../../otp/methods/employeeCreateOTP.js";
import { sendEmployeeMail } from "../../mailer/methods/employeeMailer.js";

const prisma = new PrismaClient();

export async function employeeRequestAPasswordReset(assignedEmail) {
	let db;

	try {
		if (!assignedEmail) {
			throw new Error("Email is required");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const employee = await tx.employee.findUnique({
				where: { assignedEmail },
			});

			if (!employee) {
				throw new Error("No employee found with this email");
			}

			const otpResult = await employeeCreateOTP(assignedEmail, "passwordReset");

			const settings = await tx.employeeSettings.findFirst({
				where: { employeeId: employee.employeeId },
			});

			const sendToPersonal =
				settings?.sendOTPsToPersonalEmail === true;

			let targetEmail = assignedEmail;

			if (sendToPersonal) {
				const details = await tx.employeeDetails.findUnique({
					where: { employeeId: employee.employeeId },
				});
				if (details?.personalEmail) {
					targetEmail = details.personalEmail;
				}
			}

			await sendEmployeeMail({
				to: targetEmail,
				purpose: "passwordReset",
				payload: {
					otp: otpResult.otp,
					expiresAt: new Date(otpResult.expiresAt).toLocaleTimeString(),
					subject: "Reset your HRMS password",
				},
			});

			return { success: true, message: "OTP sent for password reset" };
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeRequestAPasswordReset:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 DB disconnect error:", e);
		}
		throw err;
	}
}
