import { prisma } from "#src/db/prisma.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
/**
 * HR: check if an employee exists (by employeeId).
 * Returns exactly:
 * { presence: "true"|"false", employeeDetails: "true"|"false" }
 */
export async function hrCheckEmployeePresenceByEmployeeId(authHeader, { employeeId }) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Authorization header missing or invalid");
    }
    if (!employeeId || typeof employeeId !== "string") {
      throw new Error("employeeId is required");
    }

    // Verify HR
    const { hrId } = await verifyHrJWT(authHeader);
    const hr = await prisma.hr.findUnique({ where: { id: hrId } });
    if (!hr) throw new Error("HR not found");

    // Normalize input a tiny bit (trim)
    const eid = employeeId.trim();

    const [employee, employeeDetails] = await Promise.all([
      prisma.employee.findUnique({
      where: { employeeId: eid },
      select: { employeeId: true },
      }),
      prisma.employeeDetails.findUnique({
        where: { employeeId: eid },
        select: { employeeId: true },
      }),
    ]);

    return {
      presence: employee ? "true" : "false",
      employeeDetails: employee && employeeDetails ? "true" : "false",
    };
  } catch (err) {
    console.error("🔥 Error in hrCheckEmployeePresenceByEmployeeId:", err);
    return { presence: "false", employeeDetails: "false" };
  }
}
