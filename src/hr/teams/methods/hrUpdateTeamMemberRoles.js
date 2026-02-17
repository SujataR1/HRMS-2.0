import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR: Update roles for multiple existing memberships.
 * Role mutation endpoint (separate from assignment).
 *
 * Constraint:
 * - max 3 active leaders per team (after update)
 *
 * IMPORTANT:
 * - employeeIds are business Employee.employeeId
 * - TeamMembership.employeeId stores business Employee.employeeId
 */
export async function hrUpdateTeamMemberRoles(authHeader, { teamId, role, employeeIds }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!teamId || typeof teamId !== "string") throw new Error("teamId is required");
  if (!["leader", "member"].includes(role)) throw new Error("Invalid role");
  if (!Array.isArray(employeeIds) || employeeIds.length === 0) throw new Error("employeeIds is required");

  const ids = Array.from(
    new Set(employeeIds.map((x) => String(x).trim()).filter(Boolean))
  );
  if (ids.length === 0) throw new Error("employeeIds must contain at least one valid employeeId");

  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");

    const memberships = await tx.teamMembership.findMany({
      where: { teamId, employeeId: { in: ids }, leftAt: null },
      select: { id: true, employeeId: true, role: true },
    });

    const foundSet = new Set(memberships.map((m) => m.employeeId));
    const missing = ids.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new Error(`Active membership not found for employee(s): ${missing.join(", ")}`);
    }

    // Leader cap enforcement (after update)
    const currentActiveLeaders = await tx.teamMembership.count({
      where: { teamId, role: "leader", leftAt: null },
    });

    const leadersInSelection = memberships.filter((m) => m.role === "leader").length;
    const nonLeadersInSelection = memberships.length - leadersInSelection;

    const leadersAfter =
      role === "leader"
        ? (currentActiveLeaders - leadersInSelection) + memberships.length // all selected become leaders
        : (currentActiveLeaders - leadersInSelection); // selected leaders become members, others already not leaders

    if (leadersAfter > 3) {
      throw new Error(
        `Leader limit exceeded. Current active leaders: ${currentActiveLeaders}. Leaders after update: ${leadersAfter}. Max allowed: 3.`
      );
    }

    await tx.teamMembership.updateMany({
      where: { id: { in: memberships.map((m) => m.id) } },
      data: { role },
    });

    return { status: "success", data: { teamId, role, updatedEmployeeIds: ids } };
  });
}