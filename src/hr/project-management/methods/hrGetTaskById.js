import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrGetTaskById(authHeader, { taskId }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!taskId || typeof taskId !== "string") {
    throw new Error("taskId is required");
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: {
        include: {
          projectMember: {
            select: {
              employeeId: true,
              role: true
            }
          }
        }
      },
      latestPendingStatusChange: true
    }
  });

  if (!task) throw new Error("Task not found");

  return { status: "success", data: task };
}