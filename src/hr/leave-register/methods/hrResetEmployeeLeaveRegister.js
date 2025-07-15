import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

const ALL_RESETTABLE_FIELDS = [
  "casualCurrent", "casualCarried", "casualTotal",
  "sickCurrent", "sickCarried", "sickTotal",
  "bereavementCurrent", "bereavementCarried", "bereavementTotal",
  "maternityCurrent", "maternityCarried", "maternityTotal",
  "paternityCurrent", "paternityCarried", "paternityTotal",
  "earnedCurrent", "earnedCarried", "earnedTotal",
  "compOffCurrent", "compOffCarried", "compOffTotal",
  "otherCurrent", "otherCarried", "otherTotal",
  "grandTotal"
];

export async function hrResetEmployeeLeaveRegister(authHeader, employeeId) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR account not found");

  const existing = await prisma.leaveRegister.findUnique({ where: { employeeId } });
  if (!existing) throw new Error("Leave register not found for this employee");

  const resetData = Object.fromEntries(
    ALL_RESETTABLE_FIELDS.map((field) => [field, 0])
  );

  resetData.lastResetYear = new Date().getFullYear();

  const updated = await prisma.leaveRegister.update({
    where: { employeeId },
    data: resetData,
  });

  return {
    success: true,
    message: "Leave register has been reset",
    updated,
  };
}
