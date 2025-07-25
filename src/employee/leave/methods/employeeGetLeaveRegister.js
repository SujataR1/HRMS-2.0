import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Get full leave register for authenticated employee.
 *
 * @param {string} authHeader - Bearer token
 * @returns {Promise<Object>} Leave register summary
 */
export async function employeeGetLeaveRegister(authHeader) {
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throw new Error("Missing or invalid Authorization header");

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const reg = await prisma.leaveRegister.findUnique({
		where: { employeeId },
	});

	if (!reg) throw new Error("Leave register not found");

	return {
		casual: {
			current: reg.casualCurrent,
			carried: reg.casualCarried,
			total: reg.casualTotal,
		},
		sick: {
			current: reg.sickCurrent,
			carried: reg.sickCarried,
			total: reg.sickTotal,
		},
		bereavement: {
			current: reg.bereavementCurrent,
			carried: reg.bereavementCarried,
			total: reg.bereavementTotal,
		},
		maternity: {
			current: reg.maternityCurrent,
			carried: reg.maternityCarried,
			total: reg.maternityTotal,
		},
		paternity: {
			current: reg.paternityCurrent,
			carried: reg.paternityCarried,
			total: reg.paternityTotal,
		},
		earned: {
			current: reg.earnedCurrent,
			carried: reg.earnedCarried,
			total: reg.earnedTotal,
		},
		compOff: {
			current: reg.compOffCurrent,
			carried: reg.compOffCarried,
			total: reg.compOffTotal,
		},
		other: {
			current: reg.otherCurrent,
			carried: reg.otherCarried,
			total: reg.otherTotal,
		},
		grandTotal: reg.grandTotal,
		lastResetYear: reg.lastResetYear,
		updatedAt: reg.updatedAt,
	};
}
