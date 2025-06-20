import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Fetches all employees and manually joins their employeeDetails using employeeId.
 * @returns Array of employee objects with their corresponding employeeDetails (or null if not found).
 */
export async function adminGetAllEmployeeProfile() {
  const [employees, detailsList] = await Promise.all([
    prisma.employee.findMany(),
    prisma.employeeDetails.findMany(),
  ]);

  // Create a map for quick lookup of details by employeeId
  const detailsMap = new Map(
    detailsList.map((detail) => [detail.employeeId, detail])
  );

  // Merge employee with corresponding details
  const result = employees.map((employee) => ({
    ...employee,
    employeeDetails: detailsMap.get(employee.employeeId) || null,
  }));

  return result;
}
