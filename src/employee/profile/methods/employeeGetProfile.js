import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Fetch full profile of authenticated employee.
 *
 * @param {string} authHeader - Bearer token
 * @returns {Promise<Object>} - Full employee profile
 */
export async function employeeGetProfile(authHeader) {
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throw new Error("Missing or invalid Authorization header");

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const employee = await prisma.employee.findUnique({
		where: { employeeId },
		select: {
			employeeId: true,
			name: true,
			assignedEmail: true,
			updatedAt: true,
		},
	});

	if (!employee) {
		throw new Error("Employee not found");
	}

	const details = await prisma.employeeDetails.findUnique({
		where: { employeeId },
	});

	if (!details) {
		throw new Error("Employee details not found");
	}

	return {
		...employee,
		personalEmail: details.personalEmail,
		isPersonalEmailVerified: details.isPersonalEmailVerified,
		employmentType: details.employmentType,
		employmentStatus: details.employmentStatus,
		dateOfJoining: details.dateOfJoining,
		confirmationDate: details.confirmationDate,
		phoneNumber: details.phoneNumber,
		emergencyContactNumber: details.emergencyContactNumber,
		presentAddress: details.presentAddress,
		permanentAddress: details.permanentAddress,
		aadhaarCardNumber: details.aadhaarCardNumber,
		panCardNumber: details.panCardNumber,
		bloodGroup: details.bloodGroup,
		medicalNotes: details.medicalNotes,
		highestEducationalQualification: details.highestEducationalQualification,
		designation: details.designation,
		department: details.department,
		bankName: details.bankName,
		bankAccountNumber: details.bankAccountNumber,
		ifsCode: details.ifsCode,
		assignedShiftId: details.assignedShiftId,
	};
}
