import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";
import { auditor } from "../../../utils/logging/methods/auditor.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

function generateRandomPassword(length = 12) {
	return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export async function adminCreateAnEmployee(
	{ name, employeeId, assignedEmail },
	meta = {}
) {
	let db;

	try {
		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const existing = await tx.employee.findFirst({
				where: {
					OR: [
						{ assignedEmail },
						{ employeeId },
					],
				},
			});

			if (existing) throw new Error("Employee already exists");

			const rawPassword = generateRandomPassword();
			const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);

			const createdEmployee = await tx.employee.create({
				data: {
					employeeId,
					assignedEmail,
					name,
					password: hashedPassword,
				},
			});

			await tx.employeeSettings.create({
				data: {
					employeeId,
					isTwoFA: false,
					sendOTPsToPersonalEmail: false,
				},
			});

			await sendAdminMail({
				to: assignedEmail,
				purpose: "employeeWelcome",
				payload: {
					name,
					employeeId,
					email: assignedEmail,
					password: rawPassword,
					subject: "Welcome to the HRMS Platform",
				},
			});

			auditor({
				actorRole: "admin",
				actorId: meta.actorId || null,
				ipAddress: meta.ip,
				userAgent: meta.ua,
				referrer: meta.ref,
				endpoint: "/admin/register-employee",
				action: "create",
				targetRole: "employee",
				targetId: createdEmployee.id,
				status: "success",
				message: `Registered employee ${employeeId}`,
			});

			return {
				success: true,
				message: "Employee registered and welcome email sent",
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminRegisterAnEmployee:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}
