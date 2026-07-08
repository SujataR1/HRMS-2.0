import { prisma } from "#src/db/prisma.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
/**
 * Admin: check if an employee exists (by employeeId).
 * Returns exactly:
 * { presence: "true"|"false", employeeDetails: "true"|"false" }
 */
export async function adminCheckEmployeePresenceByEmployeeId(authHeader, { employeeId }) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Authorization header missing or invalid");
    }
    if (!employeeId || typeof employeeId !== "string") {
      throw new Error("employeeId is required");
    }

    // Verify admin
    const { adminId } = await verifyAdminJWT(authHeader);
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new Error("Admin not found");

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
    console.error("🔥 Error in adminCheckEmployeePresenceByEmployeeId:", err);
    return { presence: "false", employeeDetails: "false" };
  }
}
