import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const LOCAL_TZ = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrGetPendingLeaves(authHeader) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Authorization header missing or invalid");
	}

	await verifyHrJWT(authHeader);

	const now = dayjs().tz(LOCAL_TZ).startOf("day");

	const leaves = await prisma.leave.findMany({
		where: {
			status: "pending",
			fromDate: {
				gt: now.toDate(),
			},
		},
		select: {
			id: true,
		},
	});

	return {
		count: leaves.length,
		leaveIds: leaves.map((l) => l.id),
	};
}
