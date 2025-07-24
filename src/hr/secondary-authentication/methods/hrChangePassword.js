import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function hrChangePassword(authHeader, oldPassword, newPassword) {
	let db;
	try {
		if (!authHeader || !oldPassword || !newPassword) {
			throw new Error(
				"Authorization, old password, and new password are required"
			);
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const { hrId } = await verifyHrJWT(authHeader);

			const hr = await tx.hr.findUnique({ where: { id: hrId } });
			if (!hr) throw new Error("HR not found");

			const passwordMatch = await bcrypt.compare(
				oldPassword,
				hr.password
			);
			if (!passwordMatch) throw new Error("Old password is incorrect");

			const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

			await tx.hr.update({
				where: { id: hrId },
				data: { password: hashed },
			});

			return {
				success: true,
				message: "Password changed successfully",
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrChangePassword:", err);
		
		throw err;
	}
}
