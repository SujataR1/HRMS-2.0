import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

/**
 * Promote an employee to HR and send login credentials
 * @param {string} employeeId - ID of the employee to promote
 * @param {string|null} customPassword - Optional. Provide to override random gen
 */
export async function adminPromoteEmployeeToHR(
	authHeader,
	employeeId,
	customPassword = null
) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const { adminId } = await verifyAdminJWT(authHeader);

			const admin = await tx.admin.findUnique({
				where: { id: adminId },
			});

			if (!admin) throw new Error("Admin not found");

			// 1. Get the employee
			const employee = await tx.employee.findUnique({
				where: { employeeId },
			});
			if (!employee) throw new Error("Employee not found");

			// 2. Check if already HR
			const existingHR = await tx.hr.findUnique({
				where: { email: employee.assignedEmail },
			});
			if (existingHR) throw new Error("Employee is already HR");

			// 3. Generate & hash password
			const rawPassword =
				customPassword || crypto.randomBytes(8).toString("hex");
			const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

			// 4. Create HR
			const hr = await tx.hr.create({
				data: {
					name: employee.name,
					employeeId,
					email: employee.assignedEmail,
					password: hashedPassword,
					isEmailVerified: employee.isEmailVerified,
				},
			});

			await tx.hrSettings.create({
				data: {
					HrId: hr.id,
				},
			});

			// 5. Send credentials via mail
			try {
				await sendAdminMail({
					to: employee.assignedEmail,
					purpose: "promoteEmployeeToHR",
					payload: {
						name: employee.name,
						email: employee.assignedEmail,
						password: rawPassword,
						subject: "🎉 You’ve been promoted to HR!",
					},
				});
			} catch (mailErr) {
				console.error("✉️ Failed to send promotion email:", mailErr);
				// Consider: logging this error for admin later review
			}

			return {
				success: true,
				message: "Employee successfully promoted to HR",
				hrId: hr.id,
				email: hr.email,
				...(customPassword
					? {}
					: {
							tempPassword: rawPassword,
							note: "This password was generated automatically. Change it after login.",
						}),
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in promoteEmployeeToHR:", err);
		
		throw err;
	}
}
