// src/hr/leave-register/methods/hrEditEmployeeLeaveRegister.js

import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

import {
	buildLeaveRegisterChangedRows,
	buildLeaveRegisterRows,
	calculateGrandTotal,
	getMailTimestamp,
	sanitizeLeaveRegisterUpdateData,
	sendLeaveRegisterMailSafely,
} from "./leaveRegisterMailHelpers.js";

const prisma = new PrismaClient();

/**
 * HR-only: edit an employee leave register.
 *
 * @param {string} authHeader – "Bearer <token>"
 * @param {object} data – { employeeId, casualCurrent, sickCurrent, ... }
 */
export async function hrEditEmployeeLeaveRegister(authHeader, data = {}) {
	if (!authHeader?.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const { employeeId } = data;
	if (!employeeId) {
		throw new Error("employeeId is required");
	}

	const updateData = sanitizeLeaveRegisterUpdateData(data);

	const result = await prisma.$transaction(async (tx) => {
		const { hrId } = await verifyHrJWT(authHeader);

		const hr = await tx.hr.findUnique({ where: { id: hrId } });
		if (!hr) throw new Error("HR account not found");

		const employee = await tx.employee.findUnique({
			where: { employeeId },
			select: {
				employeeId: true,
				name: true,
				assignedEmail: true,
			},
		});
		if (!employee) throw new Error("Employee not found");

		const existing = await tx.leaveRegister.findUnique({
			where: { employeeId },
		});
		if (!existing) {
			throw new Error("Leave register not found for this employee");
		}

		const merged = {
			...existing,
			...updateData,
		};

		const finalUpdateData = {
			...updateData,
			grandTotal: calculateGrandTotal(merged),
		};

		const updated = await tx.leaveRegister.update({
			where: { employeeId },
			data: finalUpdateData,
		});

		return {
			hr,
			employee,
			before: existing,
			after: updated,
		};
	});

	const mail = await sendLeaveRegisterMailSafely({
		to: result.employee.assignedEmail,
		purpose: "leaveRegisterUpdated",
		context: {
			employeeId: result.employee.employeeId,
			registerId: result.after.id,
		},
		payload: {
			subject: "Your Leave Register Was Updated",
			name: result.employee.name,
			employeeId: result.employee.employeeId,
			updateTimestamp: getMailTimestamp(),
			changedRows: buildLeaveRegisterChangedRows(
				result.before,
				result.after
			),
			currentLeaveRegisterRows: buildLeaveRegisterRows(result.after),
		},
	});

	return {
		success: true,
		message: "Leave register updated",
		previous: result.before,
		updated: result.after,
		mail,
	};
}