import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Approves a pending TaskStatusChange:
 * - sets approvalStatus=approved + decision fields
 * - updates Task.status to toStatus (truth)
 * - sets Task.completedAt when toStatus=done else clears it
 * - clears Task.latestPendingStatusChangeId if it matches
 *
 * Requires actorProjectMemberId (active member of that project) AND role must be "lead".
 */
export async function hrApproveStatusChange(authHeader, { taskStatusChangeId, decisionRemark, actorProjectMemberId }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskStatusChangeId || typeof taskStatusChangeId !== "string") throw new Error("taskStatusChangeId is required");
  if (!actorProjectMemberId || typeof actorProjectMemberId !== "string") throw new Error("actorProjectMemberId is required");

  return await prisma.$transaction(async (tx) => {
    const change = await tx.taskStatusChange.findUnique({
      where: { id: taskStatusChangeId },
      select: { id: true, taskId: true, toStatus: true, approvalStatus: true, task: { select: { projectId: true } } },
    });
    if (!change) throw new Error("TaskStatusChange not found");
    if (change.approvalStatus !== "pending") throw new Error("Only pending status changes can be approved");

    const actor = await tx.projectMember.findFirst({
      where: { id: actorProjectMemberId, projectId: change.task.projectId, leftAt: null, role: "lead" },
      select: { id: true },
    });
    if (!actor) throw new Error("actorProjectMemberId must be an active LEAD of this project to approve");

    const decidedAt = new Date();

    await tx.taskStatusChange.update({
      where: { id: change.id },
      data: {
        approvalStatus: "approved",
        decidedByProjectMemberId: actorProjectMemberId,
        decidedAt,
        decisionRemark: decisionRemark ?? null,
      },
    });

    await tx.task.update({
      where: { id: change.taskId },
      data: {
        status: change.toStatus,
        completedAt: change.toStatus === "done" ? decidedAt : null,
        latestPendingStatusChangeId: null,
      },
    });

    return { status: "success", data: { taskId: change.taskId, newStatus: change.toStatus, approvedChangeId: change.id } };
  });
}