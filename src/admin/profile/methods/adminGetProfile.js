import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { DateTime } from "luxon";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

dotenv.config();

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function adminGetProfile(authHeader) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma;
		

		const result = await db.$transaction(
			async (tx) => {
				const { adminId } = await verifyAdminJWT(authHeader);

				const admin = await tx.admin.findUnique({
					where: { id: adminId },
					select: {
						name: true,
						email: true,
						isEmailVerified: true,
						updatedAt: true,
					},
				});

				if (!admin) throw new Error("Admin not found");

				const formattedUpdatedAt = DateTime.fromJSDate(
					admin.updatedAt,
					{ zone: "utc" }
				)
					.setZone(TIMEZONE)
					.toFormat("dd.MM.yyyy, hh:mm:ss a")
					.replace("AM", "a.m.")
					.replace("PM", "p.m.");

				return {
					...admin,
					updatedAt: formattedUpdatedAt,
				};
			},
			{ timeout: 30_000 }
		);

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminGetProfile:", err);
		
		throw err;
	}
}
