import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR: Unassign multiple employees from a team (soft remove).
 * Sets leftAt=now() for active memberships.
 * Idempotent: already removed => no-op.
 */
export async function hrUnassignTeamMembers(authHeader, { teamId, employeeIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!teamId || typeof teamId !== "string") throw new Error("teamId is required");
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new Error("employeeIds is required");

  const ids = Array.from(
    new Set(
      employeeIds
        .filter((x) => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    )
  );
  if (ids.length === 0) throw new Error("employeeIds must contain at least one valid id");

  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");

    const activeMemberships = await tx.teamMembership.findMany({
      where: {
        teamId,
        employeeId: { in: ids },
        leftAt: null,
      },
      select: { id: true, employeeId: true },
    });

    const activeSet = new Set(activeMemberships.map((m) => m.employeeId));
    const removed = [];
    const unchanged = [];

    const now = new Date();

    if (activeMemberships.length > 0) {
      await tx.teamMembership.updateMany({
        where: { id: { in: activeMemberships.map((m) => m.id) } },
        data: { leftAt: now },
      });
      removed.push(...activeMemberships.map((m) => m.employeeId));
    }

    for (const eid of ids) {
      if (!activeSet.has(eid)) unchanged.push(eid);
    }

    return {
      status: "success",
      data: {
        teamId,
        removed,
        unchanged,
      },
    };
  });
}