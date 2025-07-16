import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import dayjs from "dayjs";
import { sendEmployeeMail, sendEmployeeMailWithAttachments } from "../../../employee/mailer/methods/employeeMailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

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

	const leave = await prisma.leave.findFirst({
		where: { id: leaveId },
	});

	if (!leave) {
	throw new Error("Leave not found");
	}

	const employee = await prisma.employee.findUnique({
		where: { employeeId: leave.employeeId },
		select: { name: true, assignedEmail: true },
	});


	// if (!leave) {
	// 	throw new Error("Leave not found");
	// }

	if (leave.status !== "pending") {
		throw new Error("Only pending leaves can be approved or rejected");
	}

	const now = dayjs().tz(TIMEZONE).startOf("day");
	const leaveStart = dayjs(leave.fromDate).tz(TIMEZONE).startOf("day");

	if (!now.isBefore(leaveStart)) {
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

	const attachmentsRecord = await prisma.leaveAttachments.findFirst({
	where: { leaveId: leave.id },
	});

	const attachmentFiles = attachmentsRecord?.attachmentPaths?.map((path) => ({
		filename: path.split("/").pop(),
		path: path.startsWith("/") ? `.${path}` : `./${path}`, // relative path for nodemailer
	})) || [];

	const payload = {
		subject: `Your leave has been ${action}`,
		name: employee.name,
		leaveId: leave.id,
		fromDate: dayjs(leave.fromDate).format("YYYY-MM-DD"),
		toDate: dayjs(leave.toDate).format("YYYY-MM-DD"),
		leaveType: updatedLeaveType.join(", "),
		status: action,
		applicationNotes: leave.applicationNotes || "-",
		otherTypeDescription: leave.otherTypeDescription || "-",
	};

	if (employee?.assignedEmail) {
		if (attachmentFiles.length > 0) {
			await sendEmployeeMailWithAttachments({
				to: employee.assignedEmail,
				purpose: `leave-${action}`, // 'leave-approved' or 'leave-rejected'
				payload,
				attachments: attachmentFiles,
			});
		} else {
			await sendEmployeeMail({
				to: employee.assignedEmail,
				purpose: `leave-${action}`,
				payload,
			});
		}}

	return {
		success: true,
		message: `Leave has been ${action} successfully`,
	};
}
