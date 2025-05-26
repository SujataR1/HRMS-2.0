import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import dotenv from "dotenv";

dotenv.config();
dayjs.extend(utc);

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const AES_SECRET = process.env.AES_SECRET;
const AES_ALGO = "aes-256-cbc";

async function deleteExpiredAdminTokens(tx) {
	await tx.adminActiveSessions.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});
}

export async function createAdminJWT(adminId, payload = {}) {
	let db;
	try {
		db = prisma.$extends({});
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			await deleteExpiredAdminTokens(tx);

			const fullPayload = { adminId, ...payload };
			const jwtToken = jwt.sign(fullPayload, JWT_SECRET, {
				expiresIn: "7d",
			});

			const iv = crypto.randomBytes(16);
			const cipher = crypto.createCipheriv(
				AES_ALGO,
				Buffer.from(AES_SECRET, "hex"),
				iv
			);
			let encrypted = cipher.update(jwtToken, "utf-8", "hex");
			encrypted += cipher.final("hex");
			const encryptedToken = iv.toString("hex") + encrypted;

			const createdAt = dayjs.utc().toDate();
			const expiresAt = dayjs.utc().add(7, "days").toDate();

			await tx.adminActiveSessions.create({
				data: {
					adminId,
					token: encryptedToken,
					createdAt,
					expiresAt,
				},
			});

			return encryptedToken;
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in createAdminJWT:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}

export async function verifyAdminJWT(authHeader = "") {
	let db;
	try {
		db = prisma.$extends({});
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			await deleteExpiredAdminTokens(tx);

			if (!authHeader.startsWith("Bearer "))
				throw new Error("Invalid auth header");
			const encryptedToken = authHeader.split(" ")[1];

			const iv = Buffer.from(encryptedToken.slice(0, 32), "hex");
			const encrypted = encryptedToken.slice(32);

			const decipher = crypto.createDecipheriv(
				AES_ALGO,
				Buffer.from(AES_SECRET, "hex"),
				iv
			);
			let decrypted = decipher.update(encrypted, "hex", "utf-8");
			decrypted += decipher.final("utf-8");

			const session = await tx.adminActiveSessions.findFirst({
				where: {
					token: encryptedToken,
					expiresAt: {
						gt: new Date(),
					},
				},
			});

			if (!session) throw new Error("Session expired or not found");

			const decoded = jwt.verify(decrypted, JWT_SECRET);

			const adminExists = await tx.admin.findUnique({
				where: {
					id: decoded.adminId,
				},
			});

			if (!adminExists) throw new Error("Admin account not found");

			return decoded;
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in verifyAdminJWT:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}
