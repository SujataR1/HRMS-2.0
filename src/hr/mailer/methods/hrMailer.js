import { prisma } from "#src/db/prisma.js";
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
	port: parseInt(process.env.SMTP_PORT, 10),
	ssl: process.env.SMTP_SECURE === "true",
});

function cleanEmail(value) {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function renderTemplate({ purpose, payload }) {
	const templatePath = path.join(TEMPLATES_DIR, `${purpose}.html`);

	if (!fs.existsSync(templatePath)) {
		throw new Error(`Email template not found for purpose: ${purpose}`);
	}

	let html = fs.readFileSync(templatePath, "utf-8");

	for (const key in payload) {
		const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
		html = html.replace(pattern, payload[key] ?? "");
	}

	return html;
}

async function resolveEmployeeMailRecipients({ employeeId, fallbackEmail }) {
	const fallbackAssignedEmail = cleanEmail(fallbackEmail);

	/*
	 * No employeeId means this is not an employee-targeted HR mail.
	 * Example: monthly report sent to the HR's own email.
	 */
	if (!employeeId) {
		if (!fallbackAssignedEmail) {
			throw new Error("Recipient email is required");
		}

		return {
			assignedEmail: fallbackAssignedEmail,
			personalEmail: null,
		};
	}

	const [employee, employeeDetails] = await Promise.all([
		prisma.employee.findUnique({
			where: { employeeId },
			select: {
				assignedEmail: true,
			},
		}),

		prisma.employeeDetails.findUnique({
			where: { employeeId },
			select: {
				personalEmail: true,
			},
		}),
	]);

	const assignedEmail =
		cleanEmail(employee?.assignedEmail) || fallbackAssignedEmail;

	if (!assignedEmail) {
		throw new Error(`No assigned email found for employeeId: ${employeeId}`);
	}

	const personalEmail = cleanEmail(employeeDetails?.personalEmail);

	return {
		assignedEmail,
		personalEmail:
			personalEmail &&
			personalEmail.toLowerCase() !== assignedEmail.toLowerCase()
				? personalEmail
				: null,
	};
}

async function sendAssignedThenPersonal({
	employeeId,
	fallbackEmail,
	message,
	errorContext,
}) {
	const { assignedEmail, personalEmail } =
		await resolveEmployeeMailRecipients({
			employeeId,
			fallbackEmail,
		});

	/*
	 * Assigned email is the mandatory delivery channel.
	 * If this fails, the caller should know.
	 */
	await client.sendAsync({
		...message,
		to: assignedEmail,
	});

	let personalEmailSent = false;

	/*
	 * Personal email is an additional delivery channel.
	 * If it fails, we log it, but do not fail the HR action.
	 */
	if (employeeId && personalEmail) {
		try {
			await client.sendAsync({
				...message,
				to: personalEmail,
			});

			personalEmailSent = true;
		} catch (err) {
			console.warn(
				"⚠️ Personal email delivery failed. Assigned email was already sent.",
				{
					employeeId,
					assignedEmail,
					personalEmail,
					context: errorContext,
					error: err?.message,
				}
			);
		}
	}

	return {
		success: true,
		deliveredTo: {
			assignedEmail,
			personalEmail: personalEmailSent ? personalEmail : null,
		},
	};
}

/**
 * Sends a basic HR mail using a predefined HTML template and payload values.
 *
 * If employeeId is provided:
 * - sends to assigned email first
 * - then tries personal email separately
 * - personal email failure does not fail the whole operation
 *
 * If employeeId is not provided:
 * - sends only to `to`
 */
export async function sendHrMail({ to, employeeId, purpose, payload = {} }) {
	try {
		const html = renderTemplate({ purpose, payload });
		const subject = payload.subject || `Notification: ${purpose}`;

		const message = {
			text: html.replace(/<[^>]*>?/gm, ""),
			from:
				process.env.SMTP_FROM ||
				'"HRMS System" <no-reply@yourdomain.com>',
			subject,
			attachment: [
				{
					data: html,
					alternative: true,
				},
			],
		};

		return await sendAssignedThenPersonal({
			employeeId,
			fallbackEmail: to,
			message,
			errorContext: {
				purpose,
				hasAttachments: false,
			},
		});
	} catch (err) {
		console.error("🔥 Failed to send HR mail:", err);
		throw err;
	}
}

/**
 * Sends an HR mail with attachments using a predefined HTML template and payload values.
 *
 * If employeeId is provided:
 * - sends to assigned email first
 * - then tries personal email separately
 * - personal email failure does not fail the whole operation
 *
 * If employeeId is not provided:
 * - sends only to `to`
 */
export async function sendHrEmailWithAttachments({
	to,
	employeeId,
	purpose,
	payload = {},
	attachments = [],
}) {
	try {
		const html = renderTemplate({ purpose, payload });
		const subject = payload.subject || `Notification: ${purpose}`;

		const safeAttachments = attachments
			.map((att, index) => {
				const rawPath =
					typeof att === "string"
						? att
						: typeof att?.path === "string"
							? att.path
							: typeof att?.path?.value === "string"
								? att.path.value
								: null;

				if (!rawPath || typeof rawPath !== "string") {
					console.warn(`⚠️ HR Attachment ${index} had invalid path`, att);
					return null;
				}

				return {
					path: rawPath,
					name: att.filename || path.basename(rawPath),
					type: "application/octet-stream",
				};
			})
			.filter(Boolean);

		const message = {
			text: html.replace(/<[^>]*>?/gm, ""),
			from:
				process.env.SMTP_FROM ||
				'"HRMS System" <no-reply@yourdomain.com>',
			subject,
			attachment: [
				{
					data: html,
					alternative: true,
				},
				...safeAttachments,
			],
		};

		return await sendAssignedThenPersonal({
			employeeId,
			fallbackEmail: to,
			message,
			errorContext: {
				purpose,
				hasAttachments: safeAttachments.length > 0,
			},
		});
	} catch (err) {
		console.error("🔥 Failed to send HR mail with attachments:", err);
		throw err;
	}
}