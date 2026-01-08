import { PrismaClient } from "@prisma/client";
import { sendEmployeeMail } from "../../../employee/mailer/methods/employeeMailer.js";

const prisma = new PrismaClient();

/**
 * Best-effort notification:
 * - never throws unless throwOnFailure=true
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
			select: { name: true, assignedEmail: true },
		});

		// If no email, we silently skip (assignment should still succeed)
		if (!employee?.assignedEmail) {
			return { attempted: true, sent: false, reason: "Missing assignedEmail" };
		}

		await sendEmployeeMail({
			to: employee.assignedEmail,
			purpose: "shift-assigned",
			payload: {
				employeeName: (employee.name && employee.name.trim()) || "there",
			},
		});

		return { attempted: true, sent: true };
	} catch (err) {
		if (throwOnFailure) throw err;
		console.error("⚠️ Shift assigned mail failed:", err);
		return { attempted: true, sent: false, reason: err?.message || String(err) };
	}
}
