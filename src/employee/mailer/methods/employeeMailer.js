import dotenv from "dotenv";
import { SMTPClient } from "emailjs";
import fs from "fs";
import path from "path";

dotenv.config();

const TEMPLATES_DIR = path.resolve("src", "employee", "mailer", "templates");

const client = new SMTPClient({
	user: process.env.SMTP_USER,
	password: process.env.SMTP_PASS,
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT),
	ssl: process.env.SMTP_SECURE === "true",
});

/**
 * Sends an employee-facing email using a template and payload substitution.
 */
export async function sendEmployeeMail({ to, purpose, payload = {} }) {
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

		const subject =
			payload.subject || `Notification from HRMS – ${purpose}`;

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
			],
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send employee mail:", err);
		throw err;
	}
}

/**
 * Sends an employee-facing email with file attachments.
 */
// export async function sendEmployeeMailWithAttachments({
// 	to,
// 	purpose,
// 	payload = {},
// 	attachments = [],
// }) {
// 	try {
// 		const templatePath = path.join(TEMPLATES_DIR, `${purpose}.html`);

// 		if (!fs.existsSync(templatePath)) {
// 			throw new Error(`Email template not found for purpose: ${purpose}`);
// 		}

// 		let html = fs.readFileSync(templatePath, "utf-8");

// 		for (const key in payload) {
// 			const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
// 			html = html.replace(pattern, payload[key]);
// 		}

// 		const subject =
// 			payload.subject || `Notification from HRMS – ${purpose}`;

// 		await client.sendAsync({
// 			text: html.replace(/<[^>]*>?/gm, ""),
// 			from:
// 				process.env.SMTP_FROM ||
// 				'"HRMS System" <no-reply@yourdomain.com>',
// 			to,
// 			subject,
// 			attachment: [
// 				{
// 					data: html,
// 					alternative: true,
// 				},
// 				...attachments.map((filePath) => ({
// 					path: filePath,
// 					name: path.basename(filePath),
// 					type: "application/octet-stream",
// 				})),
// 			],
// 		});

// 		return { success: true };
// 	} catch (err) {
// 		console.error("🔥 Failed to send employee mail with attachments:", err);
// 		throw err;
// 	}}

export async function sendEmployeeMailWithAttachments({
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

		const subject =
			payload.subject || `Notification from HRMS – ${purpose}`;

		const safeAttachments = attachments.map((att, index) => {
			const rawPath = typeof att === 'string'
				? att
				: typeof att?.path === 'string'
				? att.path
				: typeof att?.path?.value === 'string'
				? att.path.value
				: null;

			if (!rawPath || typeof rawPath !== 'string') {
				console.warn(`❌ Skipping invalid attachment [${index}]:`, att);
				return null;
			}

			return {
				path: rawPath,
				name: att.filename || path.basename(rawPath),
				type: "application/octet-stream",
			};
		}).filter(Boolean); // remove nulls

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
				...safeAttachments,
			],
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send employee mail with attachments:", err);
		throw err;
	}
}

