import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function adminCreate({ name, email, password }) {
	let db;
	try {
		db = prisma.$extends({});
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			const existing = await tx.admin.findUnique({
				where: { email },
			});

			if (existing)
				throw new Error("Admin with this email already exists");

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

			return newAdmin;
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in adminCreate:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}
