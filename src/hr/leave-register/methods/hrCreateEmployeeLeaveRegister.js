// src/hr/leave-register/methods/hrCreateEmployeeLeaveRegister.js

import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

import {
	buildLeaveRegisterRows,
	calculateGrandTotal,
	getMailTimestamp,
	sanitizeLeaveRegisterCreateData,
	sendLeaveRegisterMailSafely,
} from "./leaveRegisterMailHelpers.js";

const prisma = new PrismaClient();

/**
 * HR-only: create a LeaveRegister for an employee with initial current leave values.
 *
 * @param {string} authHeader – "Bearer <token>"
 * @param {object} data – { employeeId, casualCurrent, sickCurrent, earnedCurrent, ... }
 */
export async function hrCreateEmployeeLeaveRegister(authHeader, data = {}) {
	if (!authHeader?.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const { employeeId } = data;
	if (!employeeId) {
		throw new Error("employeeId is required");
	}

	const createData = sanitizeLeaveRegisterCreateData(data);
	createData.grandTotal = calculateGrandTotal(createData);
	createData.lastResetYear = new Date().getFullYear();

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
		if (existing) {
			throw new Error("Leave register already exists for this employee");
		}

		const register = await tx.leaveRegister.create({
			data: {
				employeeId,
				...createData,
			},
		});

		return { hr, employee, register };
	});

	const mail = await sendLeaveRegisterMailSafely({
		to: result.employee.assignedEmail,
		purpose: "leaveRegisterCreated",
		context: {
			employeeId: result.employee.employeeId,
			registerId: result.register.id,
		},
		payload: {
			subject: "Your Leave Register Has Been Created",
			name: result.employee.name,
			employeeId: result.employee.employeeId,
			updateTimestamp: getMailTimestamp(),
			leaveRegisterRows: buildLeaveRegisterRows(result.register),
		},
	});

	return {
		success: true,
		message: "Leave register created",
		register: result.register,
		mail,
	};
}