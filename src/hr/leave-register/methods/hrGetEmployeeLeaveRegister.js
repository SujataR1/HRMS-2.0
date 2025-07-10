import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR-only: Fetch leave register for an employee.
 *
 * @param {string} authHeader – "Bearer <token>"
 * @param {string} employeeId
 */
export async function hrGetEmployeeLeaveRegister(authHeader, employeeId) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR account not found");

  const leaveRegister = await prisma.leaveRegister.findUnique({
    where: { employeeId },
  });

  if (!leaveRegister) {
    throw new Error("Leave register not found for this employee");
  }

  return {
    success: true,
    data: leaveRegister,
  };
}
