import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import mime from "mime-types";
import path from "path";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();
const MEDIA_BASE_PATH = process.env.MEDIA_BASE_PATH || path.join(process.cwd(), "media");

/**
 * Get base64 profile pictures for given employeeIds (Admin access).
 * @param {string} authHeader - Bearer token of Admin
 * @param {string[]} employeeIds - List of employeeIds
 * @returns {Promise<Array<{ employeeId: string, profilePicture: string | null }>>}
 */
export async function adminGetEmployeeProfilePicture(authHeader, employeeIds) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	await verifyAdminJWT(authHeader);

	const attachments = await prisma.employeeDetailsAttachments.findMany({
		where: { employeeId: { in: employeeIds } },
		select: { employeeId: true, profilePicture: true },
	});

	const results = await Promise.all(
		employeeIds.map(async (empId) => {
			const attachment = attachments.find((a) => a.employeeId === empId);
			if (!attachment?.profilePicture) {
				return { employeeId: empId, profilePicture: null };
			}

				const relativeSubpath = path.relative("/media", attachments.profilePicture);
				const absPath = path.resolve(MEDIA_BASE_PATH, relativeSubpath);

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
