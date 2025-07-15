import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import dayjs from "dayjs";

const prisma = new PrismaClient();

const ALLOWED_PAYMENT_STATUSES = ["PAID", "UNPAID", "LOP", "COMP_OFF"];
const CONFLICTING_COMBOS = [
	["PAID", "UNPAID"],
	["PAID", "LOP"],
	["COMP_OFF", "UNPAID"],
	["COMP_OFF", "LOP"]
];

function hasConflict(paymentStatuses) {
	return CONFLICTING_COMBOS.some((combo) =>
		combo.every((status) => paymentStatuses.includes(status))
	);
}

export async function hrApproveOrRejectLeave(authHeader, { leaveId, action, paymentStatuses }) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Authorization header missing or invalid");
	}

	await verifyHrJWT(authHeader);

	if (!leaveId || typeof leaveId !== "string") {
		throw new Error("Invalid leaveId");
	}

	if (![`approved`, `rejected`].includes(action)) {
		throw new Error("Action must be either 'approved' or 'rejected'");
	}

	if (action === "approved") {
		if (!Array.isArray(paymentStatuses) || paymentStatuses.length === 0) {
			throw new Error("At least one payment status must be provided when approving");
		}

		for (const status of paymentStatuses) {
			if (!ALLOWED_PAYMENT_STATUSES.includes(status)) {
				throw new Error(`Invalid payment status: ${status}`);
			}
		}

		if (hasConflict(paymentStatuses)) {
			throw new Error("Conflicting payment statuses selected");
		}
	}

	const leave = await prisma.leave.findUnique({
		where: { id: leaveId },
	});

	if (!leave) {
		throw new Error("Leave not found");
	}

	if (leave.status !== "pending") {
		throw new Error("Only pending leaves can be approved or rejected");
	}

	const now = dayjs();
	const leaveStart = dayjs(leave.fromDate);
	if (!now.isBefore(leaveStart, "day")) {
		throw new Error("Leave can only be approved or rejected before the start date");
	}

	let updatedLeaveType = leave.leaveType;

	if (action === "approved") {
		// Remove COMP_OFF if it existed in the original but not in the approved statuses
		updatedLeaveType = updatedLeaveType.filter((type) => {
			if (type === "COMP_OFF" && !paymentStatuses.includes("COMP_OFF")) return false;
			return true;
		});

		// Add the approved payment statuses
		const newSet = new Set([...updatedLeaveType, ...paymentStatuses]);
		updatedLeaveType = Array.from(newSet);
	} else {
		// If rejected, we keep the original leaveType untouched
		updatedLeaveType = leave.leaveType;
	}

	await prisma.leave.update({
		where: { id: leaveId },
		data: {
			status: action,
			leaveType: updatedLeaveType,
		},
	});

	return {
		success: true,
		message: `Leave has been ${action} successfully`,
	};
}
