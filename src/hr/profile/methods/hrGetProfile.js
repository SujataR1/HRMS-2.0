import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { DateTime } from "luxon";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

dotenv.config();

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrGetProfile(authHeader) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma;
		

		const result = await db.$transaction(
			async (tx) => {
				// 1️⃣  Decode & verify the token → hrId
				const { hrId } = await verifyHrJWT(authHeader);

				// 2️⃣  Fetch core profile fields
				const hr = await tx.hr.findUnique({
					where: { id: hrId },
					select: {
						name: true,
						email: true,
						isEmailVerified: true,
                        employeeId: true,
						updatedAt: true,
					},
				});

				if (!hr) throw new Error("HR account not found");

				// 3️⃣  Human-friendly timestamp in local TZ
				const formattedUpdatedAt = DateTime.fromJSDate(hr.updatedAt, {
					zone: "utc",
				})
					.setZone(TIMEZONE)
					.toFormat("dd.MM.yyyy, hh:mm:ss a")
					.replace("AM", "a.m.")
					.replace("PM", "p.m.");

				return {
					...hr,
					updatedAt: formattedUpdatedAt,
				};
			},
			{ timeout: 30_000 }
		);

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrGetProfile:", err);
		
		throw err;
	}
}
