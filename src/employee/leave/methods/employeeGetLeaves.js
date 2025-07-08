import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function employeeGetLeaves(authHeader, filters = {}) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const { fromDate, toDate, status, type } = filters;

	const where = {
		employeeId,
		...(status && { status }),
		...(fromDate && {
			toDate: {
				gte: dayjs.tz(fromDate, TIMEZONE).startOf("day").toDate(),
			},
		}),
		...(toDate && {
			fromDate: {
				lte: dayjs.tz(toDate, TIMEZONE).endOf("day").toDate(),
			},
		}),
		...(type && {
			leaveType: {
				has: type, // For array field
			},
		}),
	};

	const leaves = await prisma.leave.findMany({
		where,
		orderBy: { fromDate: "desc" },
	});

	const attachments = await prisma.leaveAttachments.findMany({
		where: {
			leaveId: {
				in: leaves.map((l) => l.id),
			},
		},
	});

	const attachmentMap = new Map();
	for (const att of attachments) {
		attachmentMap.set(att.leaveId, att.attachmentPaths);
	}

	return leaves.map((leave) => ({
		id: leave.id,
		fromDate: dayjs.utc(leave.fromDate).tz(TIMEZONE).format("YYYY-MM-DD"),
		toDate: dayjs.utc(leave.toDate).tz(TIMEZONE).format("YYYY-MM-DD"),
		leaveType: leave.leaveType,
		status: leave.status,
		applicationNotes: leave.applicationNotes,
		otherTypeDescription: leave.otherTypeDescription,
		createdAt: dayjs.utc(leave.createdAt).tz(TIMEZONE).format("YYYY-MM-DD HH:mm"),
		attachments: attachmentMap.get(leave.id) || [],
	}));
}
