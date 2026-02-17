import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrUpdateProjectMemberRoles(authHeader, { projectId, role, employeeIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");
  if (!["lead", "contributor"].includes(role)) throw new Error("Invalid role");
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new Error("employeeIds is required");

  const ids = Array.from(new Set(employeeIds.map((x) => String(x).trim()).filter(Boolean)));

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    const members = await tx.projectMember.findMany({
      where: { projectId, employeeId: { in: ids }, leftAt: null },
      select: { id: true, employeeId: true, role: true },
    });

    const foundSet = new Set(members.map((m) => m.employeeId));
    const missing = ids.filter((eid) => !foundSet.has(eid));
    if (missing.length) throw new Error(`Active project member not found for employeeId(s): ${missing.join(", ")}`);

    if (role === "lead") {
      const currentActiveLeads = await tx.projectMember.count({
        where: { projectId, role: "lead", leftAt: null },
      });
      const promotions = members.filter((m) => m.role !== "lead").length;

      if (currentActiveLeads + promotions > 3) {
        throw new Error(
          `Lead limit exceeded. Current active leads: ${currentActiveLeads}. Promotions: ${promotions}. Max allowed: 3.`
        );
      }
    }

    await tx.projectMember.updateMany({
      where: { id: { in: members.map((m) => m.id) } },
      data: { role },
    });

    return { status: "success", data: { projectId, role, updatedEmployeeIds: ids } };
  });
}