import { PrismaClient } from "@prisma/client";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Admin: check if an employee exists (by employeeId).
 * Returns exactly: { presence: "true" } or { presence: "false" }
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

    // Existence check
    const found = await prisma.employee.findUnique({
      where: { employeeId: eid },
      select: { employeeId: true },
    });

    return { presence: found ? "true" : "false" };
  } catch (err) {
    console.error("🔥 Error in adminCheckEmployeePresenceByEmployeeId:", err);
    // keep the response shape simple per your ask
    return { presence: "false" };
  }
}
