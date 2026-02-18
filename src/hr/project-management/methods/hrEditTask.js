import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrEditTask(authHeader, { taskId, title, description, priority, dueAt }) {
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
    where: { id: taskId }
  });

  if (!task) throw new Error("Task not found");

  const data = {};

  if (title !== undefined) {
    if (!title.trim()) throw new Error("title cannot be empty");
    data.title = title.trim();
  }

  if (description !== undefined) {
    data.description = description;
  }

  if (priority !== undefined) {
    data.priority = priority;
  }

  if (dueAt !== undefined) {
    data.dueAt = dueAt ? new Date(dueAt) : null;
  }

  await prisma.task.update({
    where: { id: taskId },
    data
  });

  return { status: "success", data: { taskId } };
}