import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrAssignProjectMembers(authHeader, { projectId, role, employeeIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");
  if (!["lead", "contributor"].includes(role)) throw new Error("Invalid role");
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new Error("employeeIds is required");

  const ids = Array.from(new Set(employeeIds.map((x) => String(x).trim()).filter(Boolean)));
  if (!ids.length) throw new Error("employeeIds must contain at least one valid employeeId");

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    // Validate employees exist by Employee.employeeId
    const foundEmployees = await tx.employee.findMany({
      where: { employeeId: { in: ids } },
      select: { employeeId: true },
    });
    const foundSet = new Set(foundEmployees.map((e) => e.employeeId));
    const missing = ids.filter((eid) => !foundSet.has(eid));
    if (missing.length) throw new Error(`Employee(s) not found: ${missing.join(", ")}`);

    const existing = await tx.projectMember.findMany({
      where: { projectId, employeeId: { in: ids } },
      select: { id: true, employeeId: true, role: true, leftAt: true },
    });
    const byEmployeeId = new Map(existing.map((m) => [m.employeeId, m]));

    // Conflict: role mismatch exists (active or inactive) => fail (ASSIGN ONLY)
    const conflicts = ids.filter((eid) => {
      const m = byEmployeeId.get(eid);
      return m && m.role !== role;
    });
    if (conflicts.length) {
      throw new Error(`Role conflict for employeeId(s): ${conflicts.join(", ")}. Use role-update endpoint.`);
    }

    // Lead cap (max 3 active leads after activation)
    if (role === "lead") {
      const currentActiveLeads = await tx.projectMember.count({
        where: { projectId, role: "lead", leftAt: null },
      });

      const willActivate = ids.filter((eid) => {
        const m = byEmployeeId.get(eid);
        if (!m) return true;
        return m.leftAt !== null;
      });

      if (currentActiveLeads + willActivate.length > 3) {
        throw new Error(
          `Lead limit exceeded. Current active leads: ${currentActiveLeads}. Will activate: ${willActivate.length}. Max allowed: 3.`
        );
      }
    }

    const assigned = [];
    const reactivated = [];
    const unchanged = [];

    for (const employeeId of ids) {
      const m = byEmployeeId.get(employeeId);

      if (!m) {
        await tx.projectMember.create({ data: { projectId, employeeId, role, leftAt: null } });
        assigned.push(employeeId);
        continue;
      }

      if (m.leftAt === null) {
        unchanged.push(employeeId);
        continue;
      }

      await tx.projectMember.update({ where: { id: m.id }, data: { leftAt: null } });
      reactivated.push(employeeId);
    }

    return { status: "success", data: { projectId, role, assigned, reactivated, unchanged } };
  });
}