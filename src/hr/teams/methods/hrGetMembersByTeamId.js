import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrGetMembersByTeamId(authHeader, { teamId, includeInactive }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!teamId || typeof teamId !== "string") throw new Error("teamId is required");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!team) throw new Error("Team not found");

  const where = { teamId };
  if (includeInactive !== true) {
    where.leftAt = null;
  }

  const members = await prisma.teamMembership.findMany({
    where,
    orderBy: [{ role: "asc" }, { joinedAt: "desc" }],
    select: {
      id: true,
      role: true,
      joinedAt: true,
      leftAt: true,
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
        },
      },
    },
  });

  return { status: "success", data: members };
}