import dotenv from "dotenv";
import { SMTPClient } from "emailjs";
import fs from "fs";
import path from "path";

dotenv.config();

const TEMPLATES_DIR = path.resolve("src", "admin", "mailer", "templates");

const client = new SMTPClient({
	user: process.env.SMTP_USER,
	password: process.env.SMTP_PASS,
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT),
	ssl: process.env.SMTP_SECURE === "true",
});

/**
 * Sends an admin notification email using a predefined HTML template.
 */
export async function sendAdminMail({ to, purpose, payload = {} }) {
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
				'"HRMS Admin" <no-reply@yourdomain.com>',
			to,
			subject,
			attachment: [
				{
					data: html,
					alternative: true,
				},
			],
		});

		return {
			success: true,
		};
	} catch (err) {
		console.error("🔥 Failed to send admin mail:", err);
		throw err;
	}
}

/**
 * Sends an admin email with file attachments.
 */
export async function sendAdminEmailWithAttachments({
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
				'"HRMS Admin" <no-reply@yourdomain.com>',
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
					type: "application/octet-stream",
				})),
			],
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send email with attachments:", err);
		throw err;
	}
}
