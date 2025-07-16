import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { sendEmployeeMail } from "../../mailer/methods/employeeMailer.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import dayjs from "dayjs";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";


const prisma = new PrismaClient();

export async function employeeEditLeaveNotes(authHeader, { leaveId, applicationNotes, otherTypeDescription }) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Authorization header missing or invalid");
	}

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const leave = await prisma.leave.findUnique({
		where: { id: leaveId },
	});

	if (!leave) {
		throw new Error("Leave not found");
	}

	if (leave.employeeId !== employeeId) {
		throw new Error("You are not authorized to modify this leave");
	}

	if (leave.status !== "pending") {
		throw new Error("Cannot modify a leave that is not pending");
	}

	const now = dayjs().tz(TIMEZONE);
	const leaveEnd = dayjs(leave.toDate).tz(TIMEZONE);

	if (now.isAfter(leaveEnd)) {
	throw new Error("Cannot edit leave notes after the leave's end date");
	}

	const previousApplicationNotes = leave.applicationNotes || "-";
	const previousOtherTypeDescription = leave.otherTypeDescription || "-";

	await prisma.leave.update({
		where: { id: leaveId },
		data: {
			applicationNotes,
			otherTypeDescription,
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
			purpose: "leave-notes-updated",
			payload: {
				subject: "Your leave notes have been updated",
				name: employee.name,
				leaveId,
				fromDate: dayjs(leave.fromDate).format("YYYY-MM-DD"),
				toDate: dayjs(leave.toDate).format("YYYY-MM-DD"),
				status: leave.status,
				leaveType: leave.leaveType.join(", "),
				previousApplicationNotes,
				previousOtherTypeDescription,
				applicationNotes: applicationNotes || "-",
				otherTypeDescription: otherTypeDescription || "-",
			},
		});
	}

	return {
		success: true,
		message: "Leave notes updated successfully",
	};
}
