import { prisma } from "#src/db/prisma.js";
export async function adminAssignAnEmployeeAShift({ employeeId, shiftId }) {
  if (!employeeId || !shiftId) {
    throw new Error("Both employeeId and shiftId are required");
  }

  const result = await prisma.employeeDetails.update({
    where: { employeeId },
    data: { assignedShiftId: shiftId },
  });

  return result;
}
