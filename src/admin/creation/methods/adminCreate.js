import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { auditor } from "../../../utils/logging/methods/auditor.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function adminCreate({ name, email, password }, meta = {}) {
	let db;
	try {
		db = prisma.$extends({});
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const existing = await tx.admin.findUnique({
				where: { email },
			});

			if (existing) {
				auditor({
					actorRole: "system",
					actorId: null,
					ipAddress: meta.ip,
					userAgent: meta.ua,
					referrer: meta.ref,
					endpoint: "/admin/create",
					action: "create",
					status: "failure",
					message: `Admin creation failed — duplicate email: ${email}`,
				});
				throw new Error("Admin with this email already exists");
			}

			const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

			const newAdmin = await tx.admin.create({
				data: {
					name,
					email,
					password: hashedPassword,
				},
			});

			await tx.adminSettings.create({
				data: {
					adminId: newAdmin.id,
				},
			});

			auditor({
				actorRole: "system",
				actorId: null,
				targetRole: "admin",
				targetId: newAdmin.id,
				ipAddress: meta.ip,
				userAgent: meta.ua,
				referrer: meta.ref,
				endpoint: "/admin/create",
				action: "create",
				status: "success",
				message: `New admin created: ${email}`,
			});

			return newAdmin;
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminCreate:", err);

		auditor({
			actorRole: "system",
			actorId: null,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/admin/create",
			action: "create",
			status: "failure",
			message: `Unhandled error in adminCreate: ${err.message || "unknown error"}`,
		});

		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}
