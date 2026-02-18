import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrGetTaskStatusHistory(authHeader, { taskId }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskId || typeof taskId !== "string") throw new Error("taskId is required");

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) throw new Error("Task not found");

  const changes = await prisma.taskStatusChange.findMany({
    where: { taskId },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      taskId: true,
      requestedAt: true,
      fromStatus: true,
      toStatus: true,
      requestRemark: true,
      approvalStatus: true,
      decidedAt: true,
      decisionRemark: true,
      requestedByProjectMemberId: true,
      decidedByProjectMemberId: true,
    },
  });

  return { status: "success", data: changes };
}