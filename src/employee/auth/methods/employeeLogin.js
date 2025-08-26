import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { auditor } from "../../../utils/logging/methods/auditor.js";
import { createEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { sendEmployeeMail } from "../../mailer/methods/employeeMailer.js";
import { employeeCreateOTP } from "../../otp/methods/employeeCreateOTP.js";

const prisma = new PrismaClient();

export async function employeeLogin({ assignedEmail, password }, meta = {}) {
	let db;
	try {
		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const employee = await tx.employee.findUnique({
				where: { assignedEmail },
			});

			if (!employee) {
				auditor({
					actorRole: "unauthenticated",
					actorId: null,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/employee/login",
					action: "login",
					status: "failure",
					message: `Login attempt failed for email: ${assignedEmail}`,
				});
				throw new Error("Invalid credentials");
			}

			if (["RESIGNED","TERMINATED"].includes((await tx.employeeDetails.findUnique({ where: { employeeId: employee.employeeId }, select: { employmentStatus: true } }))?.employmentStatus ?? "")) throw new Error("Invalid credentials");

			const passwordMatch = await bcrypt.compare(
				password,
				employee.password
			);
			if (!passwordMatch) {
				auditor({
					actorRole: "employee",
					actorId: employee.id,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/employee/login",
					action: "login",
					status: "failure",
					message: "Wrong password",
				});
				throw new Error("Invalid credentials");
			}

			const settings = await tx.employeeSettings.findFirst({
				where: { employeeId: employee.employeeId },
			});

			if (!settings) throw new Error("Employee settings not found");

			if (!settings.isTwoFA) {
				const token = await createEmployeeJWT(employee.id, {
					employeeId: employee.employeeId,
				});

				auditor({
					actorRole: "employee",
					actorId: employee.id,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/employee/login",
					action: "login",
					status: "success",
					message: "Login successful (no 2FA)",
				});

				return { token };
			}

			const otpResult = await employeeCreateOTP(assignedEmail, "twoFA");

			await sendEmployeeMail({
				to: settings.sendOTPsToPersonalEmail
					? (await tx.employeeDetails.findUnique({
							where: { employeeId: employee.employeeId },
					  })).personalEmail
					: assignedEmail,
				purpose: "twoFA",
				payload: {
					otp: otpResult.otp,
					expiresAt: new Date(
						otpResult.expiresAt
					).toLocaleTimeString(),
					subject: "Your 2FA OTP for Employee Login",
				},
			});

			auditor({
				actorRole: "employee",
				actorId: employee.id,
				ipAddress: meta.ip,
				userAgent: meta.ua,
				referrer: meta.ref,
				endpoint: "/employee/login",
				action: "login",
				status: "success",
				message: "OTP generated and sent (2FA enabled)",
			});

			return { requires2FA: true };
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeLogin:", err);
		auditor({
			actorRole: "system",
			actorId: null,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/employee/login",
			action: "login",
			status: "failure",
			message: `Unhandled error in employeeLogin: ${err.message || "unknown"}`,
		});
		
		throw err;
	}
}
