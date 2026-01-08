import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function hrAssignAnEmployeeAShift({ employeeId, shiftId }) {
	if (!employeeId || !shiftId) {
		throw new Error("Both employeeId and shiftId are required");
	}

	return await prisma.$transaction(async (tx) => {
		const employee = await tx.employeeDetails.findUnique({
			where: { employeeId },
		});
		if (!employee)
			throw new Error(
				`EmployeeDetails not found for employeeId: ${employeeId}`
			);

		const shift = await tx.shift.findUnique({ where: { id: shiftId } });
		if (!shift) throw new Error(`Shift not found for id: ${shiftId}`);

		const updated = await tx.employeeDetails.update({
			where: { employeeId },
			data: { assignedShiftId: shiftId },
		});

		try {
		await hrSendShiftAssignedMail({ employeeId });
		} catch (err) {
			// Should never break assignment, but just in case:
			console.error("⚠️ Assigned shift, but mail failed:", err);
		}

		return updated;
	});
}
