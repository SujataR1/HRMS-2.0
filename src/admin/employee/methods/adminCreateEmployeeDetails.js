import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminCreateEmployeeDetails({ employeeId, details }) {
  if (!employeeId || !details) {
    throw new Error("Both employeeId and details are required");
  }

  const existingEmployee = await prisma.employee.findUnique({
    where: { employeeId },
  });

  if (!existingEmployee) {
    throw new Error("Employee with given employeeId does not exist");
  }

  const existing = await prisma.employeeDetails.findUnique({
    where: { employeeId },
  });

  if (existing) {
    throw new Error("Employee details already exist");
  }

  const result = await prisma.employeeDetails.create({
    data: {
      employeeId,
      ...details,
    },
  });

  return result;
}
