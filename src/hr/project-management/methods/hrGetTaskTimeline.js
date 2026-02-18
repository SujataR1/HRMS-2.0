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
 * HR: Get TaskTimeline entries with filters.
 * Filters:
 * - taskId OR projectId (at least one required)
 * - employeeId (Employee.employeeId) optional
 * - projectMemberId optional
 * - from/to (timeline window) optional (matches your "from(Optional) to(Optional)")
 * - createdFrom/createdTo optional
 * - limit/offset optional
 */
export async function hrGetTaskTimeline(authHeader, body) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  const {
    taskId,
    projectId,
    employeeId,
    projectMemberId,
    from,
    to,
    createdFrom,
    createdTo,
    limit,
    offset,
  } = body;

  if (!taskId && !projectId) {
    throw new Error("Either taskId or projectId is required");
  }

  const where = {};

  // Direct task filter
  if (taskId) where.taskId = taskId;

  // Project-level filter: TaskTimeline -> Task -> Project
  // (Prisma relation assumed: TaskTimeline.task)
  if (projectId) {
    where.task = { projectId };
  }

  // Filter by project member
  if (projectMemberId) where.projectMemberId = projectMemberId;

  // Filter by employeeId (Employee.employeeId) via ProjectMember
  if (employeeId) {
    where.projectMember = { employeeId: String(employeeId).trim() };
  }

  // Your timeline window fields (not happenedAt)
  const window = buildDateRange(from, to);
  if (window) {
    // If your fields are named differently, change these 2 lines accordingly.
    // We interpret: entry overlaps requested window using "from/to" columns.
    where.AND = [
      ...(where.AND ?? []),
      { OR: [{ from: null }, { from: { lte: window.lte ?? new Date("9999-12-31") } }] },
      { OR: [{ to: null }, { to: { gte: window.gte ?? new Date("0001-01-01") } }] },
    ];
  }

  // CreatedAt window (optional)
  const createdRange = buildDateRange(createdFrom, createdTo);
  if (createdRange) where.createdAt = createdRange;

  const take = Math.min(Math.max(Number(limit ?? 50), 1), 200);
  const skip = Math.max(Number(offset ?? 0), 0);

  const rows = await prisma.taskTimeline.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    skip,
    select: {
      id: true,
      taskId: true,
      projectMemberId: true,

      from: true,
      to: true,

      notes: true,
      meta: true,

      createdAt: true,

      projectMember: { select: { employeeId: true, role: true } },
      task: { select: { projectId: true, title: true } },
    },
  });

  return { status: "success", data: rows };
}