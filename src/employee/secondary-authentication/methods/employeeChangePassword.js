import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js"

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function employeeChangePassword(authHeader, oldPassword, newPassword) {
	let db;

	try {
		if ( !oldPassword || !newPassword) {
			throw new Error("All fields are required");
		}

		db = prisma;
		await db.$connect();

		const verified = await verifyEmployeeJWT(authHeader)

		const employeeId = verified.id

		const result = await db.$transaction(async (tx) => {
			const employee = await tx.employee.findUnique({
				where: { employeeId: employeeId },
			});

			if (!employee) {
				throw new Error("Employee not found");
			}

			const match = await bcrypt.compare(oldPassword, employee.password);

			if (!match) {
				throw new Error("Old password is incorrect");
			}

			const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);

			await tx.employee.update({
				where: { employeeId: employeeId },
				data: {
					password: hashed,
				},
			});

			return {
				success: true,
				message: "Password updated successfully",
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in employeeChangePassword:", err);
		try {
			if (db) await db.$disconnect();
		} catch (e) {
			console.error("🧨 DB disconnect error:", e);
		}
		throw err;
	}
}
