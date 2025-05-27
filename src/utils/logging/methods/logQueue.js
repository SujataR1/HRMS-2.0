import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

const prisma = new PrismaClient();

const LOG_DIR = process.env.AUDIT_LOG_BACKLOG_PATH || "./logging-backlogs";
const BACKLOG_FILE = path.join(LOG_DIR, "backlogs.jsonl");

const MAX_QUEUE_LENGTH = 500;
const queue = [];
let isProcessing = false;

if (!fs.existsSync(LOG_DIR)) {
	fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function enqueueAuditLog(logData) {
	if (queue.length >= MAX_QUEUE_LENGTH) {
		console.warn("⚠️ Audit queue full, dropping log.");
		return;
	}
	queue.push(logData);
}

async function writeToDB(data) {
	try {
		await prisma.auditLog.create({ data });
		return true;
	} catch (err) {
		console.error("❌ Audit DB insert failed:", err.message);
		return false;
	}
}

async function writeToBacklogFile(data) {
	try {
		fs.appendFileSync(BACKLOG_FILE, JSON.stringify(data) + "\n");
	} catch (err) {
		console.error("💀 Failed to write to audit backlog:", err.message);
	}
}

async function flushBacklogToDB() {
	if (!fs.existsSync(BACKLOG_FILE)) return;

	const content = fs.readFileSync(BACKLOG_FILE, "utf8").trim();
	if (!content) return;

	const lines = content.split("\n");
	fs.writeFileSync(BACKLOG_FILE, ""); // clear early to avoid double logs on crash

	for (const line of lines) {
		if (!line) continue;
		try {
			const data = JSON.parse(line);
			const ok = await writeToDB(data);
			if (!ok) await writeToBacklogFile(data); // re-backlog if still fails
		} catch (e) {
			console.error("🚫 Invalid backlog line, skipping:", e.message);
		}
	}
}

async function processQueue() {
	if (isProcessing) return;
	isProcessing = true;

	try {
		await flushBacklogToDB();

		while (queue.length > 0) {
			const data = queue.shift();
			const ok = await writeToDB(data);
			if (!ok) await writeToBacklogFile(data);
		}
	} finally {
		isProcessing = false;
	}
}

setInterval(processQueue, 2000); // periodic flush

export async function gracefulAuditShutdown() {
	return new Promise((resolve) => {
		const interval = setInterval(() => {
			if (!isProcessing && queue.length === 0) {
				clearInterval(interval);
				resolve();
			}
		}, 500);
	});
}
