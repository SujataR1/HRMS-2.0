import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR-only: Fetch leave registers for multiple employees.
 *
 * @param {string} authHeader – "Bearer <token>"
 * @param {string[]} employeeIds – Array of employee IDs
 */
export async function hrGetEmployeeLeaveRegister(authHeader, employeeIds) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR account not found");

  const leaveRegisters = await prisma.leaveRegister.findMany({
    where: {
      employeeId: { in: employeeIds },
    },
  });

  const foundIds = new Set(leaveRegisters.map((lr) => lr.employeeId));
  const missingIds = employeeIds.filter((id) => !foundIds.has(id));

  return {
    success: true,
    data: leaveRegisters,
    ...(missingIds.length > 0 && { missing: missingIds }), // Optional: list missing IDs
  };
}
