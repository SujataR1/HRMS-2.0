import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import mime from "mime-types";
import path from "path";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

const prisma = new PrismaClient();
const MEDIA_BASE_PATH = path.join(process.cwd(), "media"); // Just in case

/**
 * Fetch profile picture as base64 for authenticated employee.
 * @param {string} authHeader - Bearer token
 * @returns {Promise<string|null>} - base64 image string with mime type prefix OR null
 */
export async function employeeGetProfilePicture(authHeader) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const attachments = await prisma.employeeDetailsAttachments.findUnique({
		where: { employeeId },
		select: { profilePicture: true },
	});

	if (!attachments?.profilePicture) {
		return null;
	}

	const absolutePath = path.resolve(MEDIA_BASE_PATH, attachments.profilePicture);

	try {
		const buffer = await fs.readFile(absolutePath);
		const mimeType = mime.lookup(absolutePath);
		if (!mimeType) throw new Error("Unknown file type");

		const base64 = buffer.toString("base64");
		return `data:${mimeType};base64,${base64}`;
	} catch (err) {
		console.error(`❌ Failed to read profile picture: ${err.message}`);
		return null;
	}
}
