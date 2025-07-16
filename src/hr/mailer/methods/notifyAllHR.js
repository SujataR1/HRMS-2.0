import { PrismaClient } from "@prisma/client";
import { sendHrMail, sendHrEmailWithAttachments } from "./hrMailer.js";

const prisma = new PrismaClient();

/**
 * Notifies all HRs via email using a shared template.
 * Only sends to HRs with verified email (`isEmailVerified = true`)
 */
export async function notifyAllHR({
	purpose,
	payload = {},
	attachments = false,
	attachmentFiles = [],
}) {
	const hrList = await prisma.hr.findMany({
		// where: { isEmailVerified: true },
		select: { email: true },
	});

	if (hrList.length === 0) {
		console.warn("🚨 No verified HR emails found in DB");
		return;
	}

	const send = attachments ? sendHrEmailWithAttachments : sendHrMail;

	for (const { email } of hrList) {
		await send({
			to: email,
			purpose,
			payload,
			...(attachments ? { attachments: attachmentFiles } : {}),
		});
	}
}
