import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * HR: Assign multiple employees to a team with the SAME role.
 * ASSIGN ONLY: does NOT change role of any existing membership.
 *
 * Idempotent cases:
 * - already active with same role -> unchanged
 * - existed but leftAt != null and same role -> reactivated
 *
 * Conflict (reject entire request):
 * - membership exists with different role (active or inactive)
 *
 * Constraint:
 * - max 3 active leaders per team (role=leader AND leftAt=null)
 */
export async function hrAssignTeamMembers(authHeader, { teamId, role, employeeIds }) {
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
    if (!team.isActive) throw new Error("Team is inactive");

    const foundEmployees = await tx.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundSet = new Set(foundEmployees.map((e) => e.id));
    const missing = ids.filter((id) => !foundSet.has(id));
    if (missing.length) throw new Error(`Employee(s) not found: ${missing.join(", ")}`);

    const existingMemberships = await tx.teamMembership.findMany({
      where: { teamId, employeeId: { in: ids } },
      select: { id: true, employeeId: true, role: true, leftAt: true },
    });
    const existingByEmployeeId = new Map(existingMemberships.map((m) => [m.employeeId, m]));

    // Conflict detection: any existing membership with different role
    const conflicts = ids.filter((eid) => {
      const m = existingByEmployeeId.get(eid);
      return m && m.role !== role;
    });
    if (conflicts.length) {
      throw new Error(
        `Role conflict for employee(s): ${conflicts.join(
          ", "
        )}. Use the role-update endpoint to change roles.`
      );
    }

    // Leader cap enforcement (max 3 active leaders)
    if (role === "leader") {
      const currentActiveLeaders = await tx.teamMembership.count({
        where: { teamId, role: "leader", leftAt: null },
      });

      // New/Reactivate leaders among input (only those not already active leaders)
      const willActivate = ids.filter((eid) => {
        const m = existingByEmployeeId.get(eid);
        if (!m) return true; // new leader
        return m.leftAt !== null; // reactivating leader
      });

      const leadersAfter = currentActiveLeaders + willActivate.length;
      if (leadersAfter > 3) {
        throw new Error(
          `Leader limit exceeded. Current active leaders: ${currentActiveLeaders}. Will activate: ${willActivate.length}. Max allowed: 3.`
        );
      }
    }

    const assigned = [];
    const reactivated = [];
    const unchanged = [];

    for (const employeeId of ids) {
      const existing = existingByEmployeeId.get(employeeId);

      if (!existing) {
        await tx.teamMembership.create({
          data: { teamId, employeeId, role, leftAt: null },
        });
        assigned.push(employeeId);
        continue;
      }

      // same role guaranteed (conflict checked above)
      if (existing.leftAt === null) {
        unchanged.push(employeeId);
        continue;
      }

      await tx.teamMembership.update({
        where: { id: existing.id },
        data: { leftAt: null }, // reactivate ONLY (no role mutation)
      });
      reactivated.push(employeeId);
    }

    return {
      status: "success",
      data: { teamId, role, assigned, reactivated, unchanged },
    };
  });
}