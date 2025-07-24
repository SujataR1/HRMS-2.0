import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminUpdateProfile(authHeader, { name, email }) {
	let db;
	try {
		if (!authHeader) throw new Error("Authorization header required");

		if (!name && !email) {
			throw new Error("Nothing to update");
		}

		db = prisma;
		

		const result = await db.$transaction(
			async (tx) => {
				const { adminId } = await verifyAdminJWT(authHeader);

				const existing = await tx.admin.findUnique({
					where: { id: adminId },
				});

				if (!existing) throw new Error("Admin not found");

				let updateAdminData = {};
				let resetVerification = false;

				if (email && email !== existing.email) {
					updateAdminData.email = email;
					updateAdminData.isEmailVerified = false;
					resetVerification = true;
				}

				if (name) {
					updateAdminData.name = name;
				}

				if (Object.keys(updateAdminData).length > 0) {
					await tx.admin.update({
						where: { id: adminId },
						data: updateAdminData,
					});
				}

				if (resetVerification) {
					await tx.adminSettings.updateMany({
						where: { adminId },
						data: { isTwoFA: false },
					});
				}

				return {
					success: true,
					message: "Profile updated successfully",
					updatedFields: Object.keys(updateAdminData),
				};
			},
			{ timeout: 30_000 }
		);

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminUpdateProfile:", err);
		try {
			if (db) 
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
