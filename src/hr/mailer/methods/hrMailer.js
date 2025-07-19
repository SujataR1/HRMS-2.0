import dotenv from "dotenv";
import { SMTPClient } from "emailjs";
import fs from "fs";
import path from "path";

dotenv.config();

const TEMPLATES_DIR = path.resolve("src", "hr", "mailer", "templates");

const client = new SMTPClient({
	user: process.env.SMTP_USER,
	password: process.env.SMTP_PASS,
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT),
	ssl: process.env.SMTP_SECURE === "true",
});

/**
 * Sends a basic HR mail using a predefined HTML template and payload values.
 */
export async function sendHrMail({ to, purpose, payload = {} }) {
	try {
		const templatePath = path.join(TEMPLATES_DIR, `${purpose}.html`);

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Email template not found for purpose: ${purpose}`);
		}

		let html = fs.readFileSync(templatePath, "utf-8");

		for (const key in payload) {
			const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
			html = html.replace(pattern, payload[key]);
		}

		const subject = payload.subject || `Notification: ${purpose}`;

		await client.sendAsync({
			text: html.replace(/<[^>]*>?/gm, ""), // plain text fallback
			from:
				process.env.SMTP_FROM ||
				'"HRMS System" <no-reply@yourdomain.com>',
			to,
			subject,
			attachment: [
				{
					data: html,
					alternative: true, // this marks it as HTML content
				},
			],
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send HR mail:", err);
		throw err;
	}
}

/**
 * Sends an HR mail with attachments using a predefined HTML template and payload values.
 */
export async function sendHrEmailWithAttachments({
	to,
	purpose,
	payload = {},
	attachments = [],
}) {
	try {
		const templatePath = path.join(TEMPLATES_DIR, `${purpose}.html`);

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Email template not found for purpose: ${purpose}`);
		}

		let html = fs.readFileSync(templatePath, "utf-8");

		for (const key in payload) {
			const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
			html = html.replace(pattern, payload[key]);
		}

		const subject = payload.subject || `Notification: ${purpose}`;

		await client.sendAsync({
			text: html.replace(/<[^>]*>?/gm, ""),
			from:
				process.env.SMTP_FROM ||
				'"HRMS System" <no-reply@yourdomain.com>',
			to,
			subject,
			attachment: [
				{
					data: html,
					alternative: true,
				},
				...attachments.map((filePath) => ({
					path: filePath,
					name: path.basename(filePath),
					type: "application/octet-stream", // or detect MIME
				})),
			],
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send HR mail with attachments:", err);
		throw err;
	}
}
