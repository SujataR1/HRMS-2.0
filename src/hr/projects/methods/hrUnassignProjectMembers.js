import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrUnassignProjectMembers(authHeader, { projectId, employeeIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new Error("employeeIds is required");

  const ids = Array.from(new Set(employeeIds.map((x) => String(x).trim()).filter(Boolean)));

  return await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    const active = await tx.projectMember.findMany({
      where: { projectId, employeeId: { in: ids }, leftAt: null },
      select: { id: true, employeeId: true },
    });

    const now = new Date();
    if (active.length) {
      await tx.projectMember.updateMany({
        where: { id: { in: active.map((m) => m.id) } },
        data: { leftAt: now },
      });
    }

    const removed = active.map((m) => m.employeeId);
    const removedSet = new Set(removed);
    const unchanged = ids.filter((eid) => !removedSet.has(eid));

    return { status: "success", data: { projectId, removed, unchanged } };
  });
}