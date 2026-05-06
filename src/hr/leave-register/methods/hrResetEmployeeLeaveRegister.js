// src/hr/leave-register/methods/hrResetEmployeeLeaveRegister.js

import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

import {
	buildLeaveRegisterChangedRows,
	buildLeaveRegisterRows,
	getMailTimestamp,
	RESETTABLE_LEAVE_REGISTER_FIELDS,
	sendLeaveRegisterMailSafely,
} from "./leaveRegisterMailHelpers.js";

const prisma = new PrismaClient();

export async function hrResetEmployeeLeaveRegister(authHeader, employeeId) {
	if (!authHeader?.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	if (!employeeId) {
		throw new Error("employeeId is required");
	}

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

		const resetData = Object.fromEntries(
			RESETTABLE_LEAVE_REGISTER_FIELDS.map((field) => [field, 0])
		);

		resetData.lastResetYear = new Date().getFullYear();

		const updated = await tx.leaveRegister.update({
			where: { employeeId },
			data: resetData,
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
		purpose: "leaveRegisterReset",
		context: {
			employeeId: result.employee.employeeId,
			registerId: result.after.id,
		},
		payload: {
			subject: "Your Leave Register Was Reset",
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
		message: "Leave register has been reset",
		previous: result.before,
		updated: result.after,
		mail,
	};
}