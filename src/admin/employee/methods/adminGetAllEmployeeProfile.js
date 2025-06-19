import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function adminGetAllEmployeeProfile() {
  const result = await prisma.employee.findMany({
    include: {
      employeeDetails: true,
    },
  });

  return result;
}
