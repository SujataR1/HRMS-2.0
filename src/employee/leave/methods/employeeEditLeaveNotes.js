import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import dayjs from "dayjs"; // If not already imported

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

	if (dayjs().isAfter(leave.toDate)) {
	throw new Error("Cannot edit leave notes after the leave's end date");
	}

	await prisma.leave.update({
		where: { id: leaveId },
		data: {
			applicationNotes,
			otherTypeDescription,
		},
	});

	return {
		success: true,
		message: "Leave notes updated successfully",
	};
}
