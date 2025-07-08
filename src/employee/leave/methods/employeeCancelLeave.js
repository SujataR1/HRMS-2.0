import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

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

	return {
		success: true,
		message: "Leave cancelled successfully",
	};
}
