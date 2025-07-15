import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { sendEmployeeMail } from "../../mailer/methods/employeeMailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Employee applies for a new leave.
 *
 * @param {string} authHeader - Bearer token
 * @param {object} data - Leave application data
 */
export async function employeeCreateLeave(authHeader, data) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const session = await verifyEmployeeJWT(authHeader);
	const employeeId = session.employeeId;

	const {
		fromDate,
		toDate,
		leaveType,
		otherTypeDescription = null,
		applicationNotes = null,
	} = data;

	const from = dayjs.tz(fromDate, TIMEZONE).startOf("day").toDate();
	const to = dayjs.tz(toDate, TIMEZONE).endOf("day").toDate();

	if (from > to) {
		throw new Error("fromDate cannot be after toDate");
	}

	// // Check for existing overlapping leave
	// const existing = await prisma.leave.findFirst({
	// 	where: {
	// 		employeeId,
	// 		fromDate,
	// 		toDate,
	// 		status: {not :"cancelled"}
	// 	},
	// });
	// if (existing) {
	// 	throw new Error("A leave request already exists for this date range");
	// }

	// Check for existing overlapping leave (date range overlap)
    const existing = await prisma.leave.findFirst({
    where: {
        employeeId,
        status: { not: "cancelled" },
        AND: [
        { fromDate: { lte: to } },  // leave starts on or before requested toDate
        { toDate: { gte: from } },  // leave ends on or after requested fromDate
        ],
    },
    });

	// Create the leave record
	const created = await prisma.leave.create({
		data: {
			employeeId,
			fromDate: from,
			toDate: to,
			leaveType,
			otherTypeDescription,
			applicationNotes,
			status: "pending",
		},
	});

	const employee = await prisma.employee.findUnique({
		where: { employeeId: employeeId },
		select: {
			name: true,
			assignedEmail: true,
		},
	});

	if (employee?.assignedEmail) {
		await sendEmployeeMail({
			to: employee.assignedEmail,
			purpose: "leave-applied",
			payload: {
				subject: "Your leave request has been submitted",
				name: employee.name,
				leaveId: created.id,
				fromDate: dayjs(from).format("YYYY-MM-DD"),
				toDate: dayjs(to).format("YYYY-MM-DD"),
				leaveType: leaveType.join(", "),
				applicationNotes: applicationNotes || "-",
				otherTypeDescription: otherTypeDescription || "-",
				status: "pending",
			},
		});
	}

	return {
		success: true,
		message: "Leave request submitted successfully",
		leaveId: created.id,
	};
}
