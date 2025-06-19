import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminGetEmployeeDetails(employeeId) {
  if (!employeeId) {
    throw new Error("employeeId is required");
  }

  const result = await prisma.employee.findUnique({
    where: { employeeId },
    include: {
      employeeDetails: true,
    },
  });

  if (!result) {
    throw new Error("Employee not found");
  }

  return result;
}
