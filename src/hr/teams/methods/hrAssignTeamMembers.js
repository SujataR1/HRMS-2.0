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
 *
 * IMPORTANT:
 * - Input employeeIds are Employee.employeeId (business id)
 * - TeamMembership.employeeId ALSO stores Employee.employeeId (business id)
 * - We DO NOT use Employee.id (UUID) at all here
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

  // These are BUSINESS employeeIds (Employee.employeeId)
  const ids = Array.from(
    new Set(
      employeeIds
        .filter((x) => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    )
  );
  if (ids.length === 0) throw new Error("employeeIds must contain at least one valid employeeId");

  return await prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw new Error("Team not found");
    if (!team.isActive) throw new Error("Team is inactive");

    // Validate employees exist by Employee.employeeId
    const foundEmployees = await tx.employee.findMany({
      where: { employeeId: { in: ids } },
      select: { employeeId: true },
    });
    const foundSet = new Set(foundEmployees.map((e) => e.employeeId));
    const missing = ids.filter((eid) => !foundSet.has(eid));
    if (missing.length) throw new Error(`Employee(s) not found: ${missing.join(", ")}`);

    // Existing memberships are also keyed by business employeeId
    const existingMemberships = await tx.teamMembership.findMany({
      where: { teamId, employeeId: { in: ids } },
      select: { id: true, employeeId: true, role: true, leftAt: true },
    });
    const existingByEmployeeId = new Map(existingMemberships.map((m) => [m.employeeId, m]));

    // Conflict: membership exists with different role (active OR inactive)
    const conflicts = ids.filter((eid) => {
      const m = existingByEmployeeId.get(eid);
      return m && m.role !== role;
    });
    if (conflicts.length) {
      throw new Error(
        `Role conflict for employee(s): ${conflicts.join(", ")}. Use the role-update endpoint to change roles.`
      );
    }

    // Leader cap enforcement (max 3 active leaders)
    if (role === "leader") {
      const currentActiveLeaders = await tx.teamMembership.count({
        where: { teamId, role: "leader", leftAt: null },
      });

      // willActivate = those who will become active leaders due to this call
      const willActivate = ids.filter((eid) => {
        const m = existingByEmployeeId.get(eid);
        if (!m) return true; // new membership
        return m.leftAt !== null; // reactivating membership
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

      // same role guaranteed
      if (existing.leftAt === null) {
        unchanged.push(employeeId);
        continue;
      }

      await tx.teamMembership.update({
        where: { id: existing.id },
        data: { leftAt: null }, // reactivate ONLY
      });
      reactivated.push(employeeId);
    }

    return {
      status: "success",
      data: { teamId, role, assigned, reactivated, unchanged },
    };
  });
}