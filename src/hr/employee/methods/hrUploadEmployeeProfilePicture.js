import { prisma } from "#src/db/prisma.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
/**
 * Updates the profilePicturePath for an employee.
 *
 * @param {string} authHeader – Bearer token for HR
 * @param {string} employeeId – UUID of the employee
 * @param {string} profilePicturePath – Relative path to the saved file
 */
export async function hrUploadEmployeeProfilePicture(authHeader, {employeeId, profilePicturePath}) {
	try {
		// 🔐 Auth check
		await verifyHrJWT(authHeader);

		// 🛠️ Upsert-style update
		await prisma.employeeDetailsAttachments.upsert({
			where: { employeeId },
			update: { profilePicture: profilePicturePath },
			create: {
				employeeId,
				profilePicture: profilePicturePath,
			},
			});

		return {
			status: "success",
			message: "Profile picture path updated successfully.",
			path: profilePicturePath,
		};
	} catch (err) {
		console.error("🔥 Failed to update employee profile picture path:", err);
		throw err;
	}
}
