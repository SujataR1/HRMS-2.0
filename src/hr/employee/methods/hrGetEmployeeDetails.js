import { prisma } from "#src/db/prisma.js";

export async function hrGetEmployeeDetails(employeeId) {
	if (!employeeId) throw new Error("employeeId is required");

	return await prisma.$transaction(async (tx) => {
		const details = await tx.employeeDetails.findUnique({
			where: { employeeId },
			select: {
				employeeId: true,
				personalEmail: true,
				isPersonalEmailVerified: true,
				employmentType: true,
				employmentStatus: true,
				dateOfJoining: true,
				confirmationDate: true,
				dateOfBirth: true,
				phoneNumber: true,
				emergencyContactNumber: true,
				presentAddress: true,
				permanentAddress: true,
				aadhaarCardNumber: true,
				panCardNumber: true,
				bloodGroup: true,
				medicalNotes: true,
				highestEducationalQualification: true,
				designation: true,
				department: true,
				bankName: true,
				bankAccountNumber: true,
				ifsCode: true,
				assignedShiftId: true,
			},
		});

		if (!details)
			throw new Error(`No details found for employeeId: ${employeeId}`);

		return details;
	});
}