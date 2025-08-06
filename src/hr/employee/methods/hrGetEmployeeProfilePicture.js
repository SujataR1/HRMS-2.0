import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import mime from "mime-types";
import path from "path";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();
const MEDIA_BASE_PATH = path.join(process.cwd(), "media");

/**
 * Get base64 profile pictures for given employeeIds (HR access).
 * @param {string} authHeader - Bearer token of HR
 * @param {string[]} employeeIds - List of employeeIds
 * @returns {Promise<Array<{ employeeId: string, profilePicture: string | null }>>}
 */
export async function hrGetEmployeeProfilePicture(authHeader, employeeIds) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	// Auth check
	await verifyHrJWT(authHeader);

	// Fetch all attachments in one go
	const attachments = await prisma.employeeDetailsAttachments.findMany({
		where: {
			employeeId: {
				in: employeeIds,
			},
		},
		select: {
			employeeId: true,
			profilePicture: true,
		},
	});

	const results = await Promise.all(
		employeeIds.map(async (empId) => {
			const attachment = attachments.find((a) => a.employeeId === empId);
			if (!attachment?.profilePicture) {
				return { employeeId: empId, profilePicture: null };
			}

			const absPath = path.resolve(MEDIA_BASE_PATH, attachment.profilePicture);

			try {
				const buffer = await fs.readFile(absPath);
				const mimeType = mime.lookup(absPath);
				if (!mimeType) throw new Error("Unknown MIME type");

				const base64 = buffer.toString("base64");
				return {
					employeeId: empId,
					profilePicture: `data:${mimeType};base64,${base64}`,
				};
			} catch (err) {
				console.error(`❌ Failed to read profile picture for ${empId}: ${err.message}`);
				return { employeeId: empId, profilePicture: null };
			}
		})
	);

	return results;
}
