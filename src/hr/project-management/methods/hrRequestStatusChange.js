import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Creates a TaskStatusChange as PENDING and sets Task.latestPendingStatusChangeId.
 * Requires actorProjectMemberId (active member of that task's project).
 * Rejects if there is already a pending change (pointer not null).
 */
export async function hrRequestStatusChange(authHeader, { taskId, toStatus, requestRemark, actorProjectMemberId }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskId || typeof taskId !== "string") throw new Error("taskId is required");
  if (!actorProjectMemberId || typeof actorProjectMemberId !== "string") throw new Error("actorProjectMemberId is required");

  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, status: true, latestPendingStatusChangeId: true },
    });
    if (!task) throw new Error("Task not found");

    if (task.latestPendingStatusChangeId) {
      // Strict invariant: only 1 pending at a time
      throw new Error("A pending status change already exists for this task");
    }

    const actor = await tx.projectMember.findFirst({
      where: { id: actorProjectMemberId, projectId: task.projectId, leftAt: null },
      select: { id: true },
    });
    if (!actor) throw new Error("actorProjectMemberId is not an active member of this project");

    if (task.status === toStatus) throw new Error("toStatus is same as current status");

    const change = await tx.taskStatusChange.create({
      data: {
        taskId: task.id,
        requestedByProjectMemberId: actorProjectMemberId,
        fromStatus: task.status,
        toStatus,
        requestRemark: requestRemark ?? null,
        approvalStatus: "pending",
      },
      select: { id: true },
    });

    await tx.task.update({
      where: { id: task.id },
      data: { latestPendingStatusChangeId: change.id },
    });

    return { status: "success", data: { statusChangeId: change.id } };
  });
}