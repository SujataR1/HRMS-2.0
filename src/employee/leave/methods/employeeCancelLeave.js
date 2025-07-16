import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { sendEmployeeMail } from "../../mailer/methods/employeeMailer.js";
import { notifyAllHR } from "../../../hr/mailer/methods/notifyAllHR.js";
import dayjs from "dayjs";

const prisma = new PrismaClient();

export async function employeeCancelLeave(authHeader, { leaveId }) {
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
		throw new Error("You are not authorized to cancel this leave");
	}

	if (leave.status === "cancelled") {
		throw new Error("Leave is already cancelled");
	}

	if (leave.status === "rejected") {
		throw new Error("Rejected leaves cannot be cancelled");
	}

	await prisma.leave.update({
		where: { id: leaveId },
		data: {
			status: "cancelled",
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
			purpose: "leave-cancelled",
			payload: {
				subject: "Your leave has been cancelled",
				name: employee.name,
				leaveId,
				fromDate: dayjs(leave.fromDate).format("YYYY-MM-DD"),
				toDate: dayjs(leave.toDate).format("YYYY-MM-DD"),
				leaveType: leave.leaveType.join(", "),
				status: "cancelled",
				applicationNotes: leave.applicationNotes || "-",
				otherTypeDescription: leave.otherTypeDescription || "-",
			},
		});

		await notifyAllHR({
		purpose: "leave-cancelled",
		payload: {
			subject: `Leave cancelled by ${employee.name}`,
			name: employee.name,
			leaveId,
			fromDate: dayjs(leave.fromDate).format("YYYY-MM-DD"),
			toDate: dayjs(leave.toDate).format("YYYY-MM-DD"),
			leaveType: leave.leaveType.join(", "),
			status: "cancelled",
			applicationNotes: leave.applicationNotes || "-",
			otherTypeDescription: leave.otherTypeDescription || "-",
		},
		});
	}


	return {
		success: true,
		message: "Leave cancelled successfully",
	};
}
