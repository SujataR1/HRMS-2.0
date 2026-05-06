import { PrismaClient } from "@prisma/client";
import { sendEmployeeMail } from "./employeeMailer.js";

const prisma = new PrismaClient();

/**
 * Best-effort notification:
 * - never throws unless throwOnFailure=true
 * - assigned email is mandatory delivery
 * - personal email is additional best-effort delivery
 * - payload must match template contract: { employeeName }
 */
export async function hrSendShiftAssignedMail({
	employeeId,
	throwOnFailure = false,
}) {
	if (!employeeId) throw new Error("employeeId is required");

	try {
		const employee = await prisma.employee.findUnique({
			where: { employeeId },
			select: {
				employeeId: true,
				name: true,
				assignedEmail: true,
			},
		});

		if (!employee?.assignedEmail) {
			return {
				attempted: true,
				sent: false,
				reason: "Missing assignedEmail",
			};
		}

		const mailResult = await sendEmployeeMail({
			employeeId: employee.employeeId,
			to: employee.assignedEmail,
			purpose: "shift-assigned",
			payload: {
				employeeName: employee.name?.trim() || "there",
			},
		});

		return {
			attempted: true,
			sent: true,
			mail: mailResult,
		};
	} catch (err) {
		if (throwOnFailure) throw err;

		console.error("⚠️ Shift assigned mail failed:", err);

		return {
			attempted: true,
			sent: false,
			reason: err?.message || String(err),
		};
	}
}