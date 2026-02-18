import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Assign task to project members (bulk).
 * Idempotent: already assigned => unchanged.
 * Hard rule: projectMember must belong to the same project as task.
 */
export async function hrAssignTask(authHeader, { taskId, projectMemberIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskId || typeof taskId !== "string") throw new Error("taskId is required");
  if (!Array.isArray(projectMemberIds) || projectMemberIds.length === 0) throw new Error("projectMemberIds is required");

  const ids = Array.from(new Set(projectMemberIds.map((x) => String(x).trim()).filter(Boolean)));
  if (!ids.length) throw new Error("projectMemberIds must contain at least one valid id");

  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true } });
    if (!task) throw new Error("Task not found");

    // Ensure all projectMemberIds belong to same project and are active
    const members = await tx.projectMember.findMany({
      where: { id: { in: ids }, projectId: task.projectId, leftAt: null },
      select: { id: true },
    });

    const foundSet = new Set(members.map((m) => m.id));
    const missing = ids.filter((id) => !foundSet.has(id));
    if (missing.length) throw new Error(`Active project member(s) not found in this project: ${missing.join(", ")}`);

    // Find existing assignments (idempotency)
    const existing = await tx.taskAssignment.findMany({
      where: { taskId, projectMemberId: { in: ids } },
      select: { projectMemberId: true },
    });
    const existingSet = new Set(existing.map((a) => a.projectMemberId));

    const toCreate = ids.filter((id) => !existingSet.has(id));
    const assigned = [];
    const unchanged = ids.filter((id) => existingSet.has(id));

    // Create individually (safe even if unique constraints differ)
    for (const pmId of toCreate) {
      try {
        await tx.taskAssignment.create({
          data: { taskId, projectMemberId: pmId },
        });
        assigned.push(pmId);
      } catch (e) {
        // If a race creates it, treat as unchanged
        unchanged.push(pmId);
      }
    }

    return { status: "success", data: { taskId, assigned, unchanged } };
  });
}