import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminGetEmployeeDetails(employeeId) {
  if (!employeeId) {
    throw new Error("employeeId is required");
  }

  const employee = await prisma.employee.findUnique({
    where: { employeeId },
  });

  if (!employee) {
    throw new Error(`Employee with ID '${employeeId}' not found.`);
  }

  const employeeDetails = await prisma.employeeDetails.findUnique({
    where: { employeeId },
  });

  return {
    ...employee,
    employeeDetails: employeeDetails || null,
  };
}
