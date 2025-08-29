import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR: check if an employee exists (by employeeId).
 * Returns exactly: { presence: "true" } or { presence: "false" }
 */
export async function hrCheckEmployeePresenceByEmployeeId(authHeader, { employeeId }) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Authorization header missing or invalid");
    }
    if (!employeeId || typeof employeeId !== "string") {
      throw new Error("employeeId is required");
    }

    // Verify admin
    const { hrId } = await verifyHrJWT(authHeader);
    const hr = await prisma.hr.findUnique({ where: { id: hrId } });
    if (!hr) throw new Error("HR not found");

    // Normalize input a tiny bit (trim)
    const eid = employeeId.trim();

    // Existence check
    const found = await prisma.employee.findUnique({
      where: { employeeId: eid },
      select: { employeeId: true },
    });

    return { presence: found ? "true" : "false" };
  } catch (err) {
    console.error("🔥 Error in hrCheckEmployeePresenceByEmployeeId:", err);
    // keep the response shape simple per your ask
    return { presence: "false" };
  }
}
