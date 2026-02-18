import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

function buildDateRange(from, to) {
  const range = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return Object.keys(range).length ? range : undefined;
}

/**
 * Filters:
 * - projectId (required)
 * - assignedEmployeeId (Employee.employeeId) optional
 * - status, priority optional
 * - dueFrom/dueTo, createdFrom/createdTo, updatedFrom/updatedTo optional
 * - onlyIds: if true => {taskIds:[...]} else => array of compact rows
 */
export async function hrGetTasksByProject(authHeader, body) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  const {
    projectId,
    assignedEmployeeId,
    status,
    priority,
    dueFrom,
    dueTo,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    onlyIds,
  } = body;

  if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");

  const where = {
    projectId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(buildDateRange(dueFrom, dueTo) ? { dueAt: buildDateRange(dueFrom, dueTo) } : {}),
    ...(buildDateRange(createdFrom, createdTo) ? { createdAt: buildDateRange(createdFrom, createdTo) } : {}),
    ...(buildDateRange(updatedFrom, updatedTo) ? { updatedAt: buildDateRange(updatedFrom, updatedTo) } : {}),
  };

  if (assignedEmployeeId) {
    where.assignments = {
      some: {
        projectMember: {
          employeeId: String(assignedEmployeeId).trim(),
        },
      },
    };
  }

  if (onlyIds === true) {
    const tasks = await prisma.task.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    return { status: "success", data: { taskIds: tasks.map((t) => t.id) } };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      createdAt: true,
      updatedAt: true,
      latestPendingStatusChangeId: true,
      assignments: {
        select: {
          projectMember: { select: { employeeId: true } },
        },
      },
    },
  });

  const compact = tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    latestPendingStatusChangeId: t.latestPendingStatusChangeId,
    assignedEmployeeIds: t.assignments.map((a) => a.projectMember.employeeId),
  }));

  return { status: "success", data: compact };
}