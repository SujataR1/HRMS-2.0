import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR-only: create a LeaveRegister for an employee with initial current leave values.
 *
 * @param {string} authHeader – "Bearer <token>"
 * @param {object} data – { employeeId, casualCurrent, sickCurrent, earnedCurrent, ... }
 */
export async function hrCreateEmployeeLeaveRegister(authHeader, data) {
	if (!authHeader?.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const { hrId } = await verifyHrJWT(authHeader);
	const hr = await prisma.hr.findUnique({ where: { id: hrId } });
	if (!hr) throw new Error("HR account not found");

	const {
		employeeId,
		casualCurrent = 0,
		sickCurrent = 0,
		bereavementCurrent = 0,
		maternityCurrent = 0,
		paternityCurrent = 0,
		earnedCurrent = 0,
		compOffCurrent = 0,
		otherCurrent = 0,
	} = data;

	// prevent dupes
	const exists = await prisma.leaveRegister.findUnique({
		where: { employeeId },
	});
	if (exists) throw new Error("Leave register already exists for this employee");

	// Calculate grand total manually
	const grandTotal =
		casualCurrent +
		sickCurrent +
		bereavementCurrent +
		maternityCurrent +
		paternityCurrent +
		earnedCurrent +
		compOffCurrent +
		otherCurrent;

	const nowYear = new Date().getFullYear();

	const newRegister = await prisma.leaveRegister.create({
		data: {
			employeeId,

			casualCurrent,
			sickCurrent,
			bereavementCurrent,
			maternityCurrent,
			paternityCurrent,
			earnedCurrent,
			compOffCurrent,
			otherCurrent,

			// carried + total all default to 0
			grandTotal,
			lastResetYear: nowYear,
		},
	});

	return {
		success: true,
		message: "Leave register created",
		register: newRegister,
	};
}
