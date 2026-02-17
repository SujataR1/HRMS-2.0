import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrGetProjectMembersByProjectId(authHeader, { projectId, includeInactive }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");

  const where = { projectId };
  if (includeInactive !== true) where.leftAt = null;

  const members = await prisma.projectMember.findMany({
    where,
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
    select: {
      id: true,
      role: true,
      joinedAt: true,
      leftAt: true,
      employeeId: true, // Employee.employeeId FK value
      employee: { select: { employeeId: true, name: true } },
    },
  });

  return { status: "success", data: members };
}