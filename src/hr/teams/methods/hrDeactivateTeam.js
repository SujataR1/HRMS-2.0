import { prisma } from "#src/db/prisma.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
export async function hrDeactivateTeam(authHeader, { teamId }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!teamId || typeof teamId !== "string") throw new Error("teamId is required");

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found");

  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { isActive: false },
  });

  return { status: "success", data: updated };
}