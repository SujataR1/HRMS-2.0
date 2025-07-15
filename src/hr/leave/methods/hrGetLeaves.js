import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * HR views employee leaves with optional filters.
 *
 * @param {string} authHeader - Bearer token
 * @param {object} filters - Optional filters (employeeId, fromDate, toDate, status, type)
 */
export async function hrGetLeaves(authHeader, filters = {}) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	await verifyHrJWT(authHeader); // Identity is not used here but required for auth

	const { employeeId, fromDate, toDate, status, type } = filters;

	const where = {
		...(employeeId && { employeeId }),
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
				has: type, // Array field
			},
		}),
	};

	const leaves = await prisma.leave.findMany({
	where: {
		...where,
		// employeeId: employeeId,
	},
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
		employeeId: leave.employeeId,
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
