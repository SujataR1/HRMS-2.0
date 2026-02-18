import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrCreateTask(authHeader, { projectId, title, description, priority, dueAt }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!projectId || typeof projectId !== "string") {
    throw new Error("projectId is required");
  }

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("title is required");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) throw new Error("Project not found");

  const task = await prisma.task.create({
    data: {
      projectId,
      title: title.trim(),
      description: description ?? null,
      priority: priority ?? "medium",
      dueAt: dueAt ? new Date(dueAt) : null
    }
  });

  return { status: "success", data: { taskId: task.id } };
}