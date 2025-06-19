import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminUpdateEmployeeDetails({ employeeId, updates }) {
  if (!employeeId || !updates) {
    throw new Error("Both employeeId and updates are required");
  }

  const result = await prisma.employeeDetails.update({
    where: { employeeId },
    data: updates,
  });

  return result;
}
