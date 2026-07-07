import { prisma } from "#src/db/prisma.js";
import dotenv from "dotenv";
import { SMTPClient } from "emailjs";
import fs from "fs";
import path from "path";
import { notifyEmployeeFromMailer } from "#src/notifications/methods/notificationService.js";

dotenv.config();
const TEMPLATES_DIR = path.resolve("src", "employee", "mailer", "templates");

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

function normalizeAttachment(att, index) {
	const rawPath =
		typeof att === "string"
			? att
			: typeof att?.path === "string"
				? att.path
				: typeof att?.path?.value === "string"
					? att.path.value
					: null;

	if (!rawPath) {
		console.warn(`⚠️ Employee attachment ${index} had invalid path`, att);
		return null;
	}

	return {
		path: rawPath,
		name:
			typeof att === "object" && att?.filename
				? att.filename
				: path.basename(rawPath),
		type:
			typeof att === "object" && att?.type
				? att.type
				: "application/octet-stream",
	};
}

async function resolveEmployeeMailRecipients({ employeeId, fallbackEmail }) {
	const fallbackAssignedEmail = cleanEmail(fallbackEmail);

	/*
	 * No employeeId means this is not employee-aware delivery.
	 * Keep old behavior: send only to `to`.
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
	 * Assigned email is mandatory.
	 * If this fails, the caller should know.
	 */
	await client.sendAsync({
		...message,
		to: assignedEmail,
	});

	let personalEmailSent = false;

	/*
	 * Personal email is additional best-effort delivery.
	 * If it fails, assigned email has already received the mail.
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
 * Sends an employee-facing email using a template and payload substitution.
 *
 * If employeeId is provided:
 * - sends to assigned email first
 * - then tries personal email separately
 * - personal email failure does not fail the whole operation
 *
 * If employeeId is not provided:
 * - sends only to `to`
 */
export async function sendEmployeeMail({
	to,
	employeeId,
	purpose,
	payload = {},
	sendLiveNotification = true,
}) {
	try {
		const html = renderTemplate({ purpose, payload });

		const subject =
			payload.subject || `Notification from HRMS – ${purpose}`;

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

		const result = await sendAssignedThenPersonal({
			employeeId,
			fallbackEmail: to,
			message,
			errorContext: {
				purpose,
				hasAttachments: false,
			},
		});

		if (sendLiveNotification) {
			try {
				await notifyEmployeeFromMailer({
					employeeId,
					source: "employee-mailer",
					purpose,
					payload,
				});
			} catch (notificationErr) {
				console.warn("⚠️ Employee live notification failed after mail send", {
					employeeId,
					purpose,
					error: notificationErr?.message,
				});
			}
		}

		return result;
	} catch (err) {
		console.error("🔥 Failed to send employee mail:", err);
		throw err;
	}
}

/**
 * Sends an employee-facing email with file attachments.
 *
 * If employeeId is provided:
 * - sends to assigned email first
 * - then tries personal email separately
 * - personal email failure does not fail the whole operation
 *
 * If employeeId is not provided:
 * - sends only to `to`
 */
export async function sendEmployeeMailWithAttachments({
	to,
	employeeId,
	purpose,
	payload = {},
	attachments = [],
}) {
	try {
		const html = renderTemplate({ purpose, payload });

		const subject =
			payload.subject || `Notification from HRMS – ${purpose}`;

		const safeAttachments = attachments
			.map((att, index) => normalizeAttachment(att, index))
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

		const result = await sendAssignedThenPersonal({
			employeeId,
			fallbackEmail: to,
			message,
			errorContext: {
				purpose,
				hasAttachments: safeAttachments.length > 0,
			},
		});

		try {
			await notifyEmployeeFromMailer({
				employeeId,
				source: "employee-mailer",
				purpose,
				payload: {
					...payload,
					hasAttachments: safeAttachments.length > 0,
				},
			});
		} catch (notificationErr) {
			console.warn(
				"⚠️ Employee live notification failed after mail-with-attachments send",
				{
					employeeId,
					purpose,
					error: notificationErr?.message,
				}
			);
		}

		return result;
	} catch (err) {
		console.error("🔥 Failed to send employee mail with attachments:", err);
		throw err;
	}
}
