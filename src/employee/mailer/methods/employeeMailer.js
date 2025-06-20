import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const TEMPLATES_DIR = path.resolve("src", "employee", "mailer", "templates");

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: parseInt(process.env.SMTP_PORT),
	secure: process.env.SMTP_SECURE === "true",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

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
		console.error("🔥 Failed to send employee mail:", err);
		throw err;
	}
}
