import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Unassign task from project members (bulk).
 * Idempotent: if not assigned => unchanged.
 * Uses deleteMany (hard unassign) to avoid unknown soft-delete fields.
 */
export async function hrUnassignTask(authHeader, { taskId, projectMemberIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskId || typeof taskId !== "string") throw new Error("taskId is required");
  if (!Array.isArray(projectMemberIds) || projectMemberIds.length === 0) throw new Error("projectMemberIds is required");

  const ids = Array.from(new Set(projectMemberIds.map((x) => String(x).trim()).filter(Boolean)));
  if (!ids.length) throw new Error("projectMemberIds must contain at least one valid id");

  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) throw new Error("Task not found");

    const existing = await tx.taskAssignment.findMany({
      where: { taskId, projectMemberId: { in: ids } },
      select: { projectMemberId: true },
    });
    const existingSet = new Set(existing.map((a) => a.projectMemberId));

    const toRemove = ids.filter((id) => existingSet.has(id));
    const unchanged = ids.filter((id) => !existingSet.has(id));

    if (toRemove.length) {
      await tx.taskAssignment.deleteMany({
        where: { taskId, projectMemberId: { in: toRemove } },
      });
    }

    return { status: "success", data: { taskId, removed: toRemove, unchanged } };
  });
}