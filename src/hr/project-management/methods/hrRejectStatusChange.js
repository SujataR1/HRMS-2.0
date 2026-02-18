import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Rejects a pending TaskStatusChange:
 * - sets approvalStatus=rejected + decision fields
 * - clears Task.latestPendingStatusChangeId
 * Requires actorProjectMemberId active LEAD.
 */
export async function hrRejectStatusChange(authHeader, { taskStatusChangeId, decisionRemark, actorProjectMemberId }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskStatusChangeId || typeof taskStatusChangeId !== "string") throw new Error("taskStatusChangeId is required");
  if (!actorProjectMemberId || typeof actorProjectMemberId !== "string") throw new Error("actorProjectMemberId is required");

  return await prisma.$transaction(async (tx) => {
    const change = await tx.taskStatusChange.findUnique({
      where: { id: taskStatusChangeId },
      select: { id: true, taskId: true, approvalStatus: true, task: { select: { projectId: true } } },
    });
    if (!change) throw new Error("TaskStatusChange not found");
    if (change.approvalStatus !== "pending") throw new Error("Only pending status changes can be rejected");

    const actor = await tx.projectMember.findFirst({
      where: { id: actorProjectMemberId, projectId: change.task.projectId, leftAt: null, role: "lead" },
      select: { id: true },
    });
    if (!actor) throw new Error("actorProjectMemberId must be an active LEAD of this project to reject");

    const decidedAt = new Date();

    await tx.taskStatusChange.update({
      where: { id: change.id },
      data: {
        approvalStatus: "rejected",
        decidedByProjectMemberId: actorProjectMemberId,
        decidedAt,
        decisionRemark: decisionRemark ?? null,
      },
    });

    await tx.task.update({
      where: { id: change.taskId },
      data: { latestPendingStatusChangeId: null },
    });

    return { status: "success", data: { taskId: change.taskId, rejectedChangeId: change.id } };
  });
}