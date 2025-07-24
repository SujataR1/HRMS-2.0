import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
dayjs.extend(utc);

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const AES_SECRET = process.env.AES_SECRET;
const AES_ALGO = "aes-256-cbc";

async function deleteExpiredHrTokens(tx) {
	await tx.hrActiveSessions.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});
}

export async function createHrJWT(hrId, payload = {}) {
	let db;
	try {
		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			await deleteExpiredHrTokens(tx);

			const fullPayload = { hrId, ...payload };
			const jwtToken = jwt.sign(fullPayload, JWT_SECRET);

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

			await tx.hrActiveSessions.create({
				data: {
					hrId,
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
		console.error("🔥 Error in createHrJWT:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}

export async function verifyHrJWT(authHeader = "") {
	let db;
	try {
		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			await deleteExpiredHrTokens(tx);

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

			const session = await tx.hrActiveSessions.findFirst({
				where: {
					token: encryptedToken,
					expiresAt: {
						gt: new Date(),
					},
				},
			});

			if (!session) throw new Error("Session expired or not found");

			const decoded = jwt.verify(decrypted, JWT_SECRET);

			const hrExists = await tx.hr.findUnique({
				where: {
					id: decoded.hrId,
				},
			});

			if (!hrExists) throw new Error("HR account not found");

			return decoded;
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in verifyHrJWT:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 Error disconnecting DB:", e);
		}
		throw err;
	}
}
