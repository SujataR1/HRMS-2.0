import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";

dotenv.config();

const TEMPLATES_DIR = path.resolve("src", "hr", "mailer", "templates");

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT),
	secure: process.env.SMTP_SECURE === "true",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

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

		await transporter.sendMail({
			from:
				process.env.SMTP_FROM ||
				'"HRMS System" <no-reply@yourdomain.com>',
			to,
			subject,
			html,
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send HR mail:", err);
		throw err;
	}
}

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

		await transporter.sendMail({
			from:
				process.env.SMTP_FROM ||
				'"HRMS System" <no-reply@yourdomain.com>',
			to,
			subject,
			html,
			attachments: attachments.map((filePath) => ({
				filename: path.basename(filePath),
				path: filePath,
			})),
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Failed to send HR mail with attachments:", err);
		throw err;
	}
}
