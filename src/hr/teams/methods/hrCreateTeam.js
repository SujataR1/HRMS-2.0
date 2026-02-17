import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrCreateTeam(authHeader, { name, description }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Team name is required");
  }

  const teamName = name.trim();
  const desc = description === undefined ? null : description;

  const existing = await prisma.team.findUnique({
  where: { name: teamName },
  select: { id: true, name: true, isActive: true },
  });

  if (existing) {
    if (existing.isActive) {
      // already active => true conflict (same semantics as before)
      throw new Error(`Team "${teamName}" already exists`);
    }

    // exists but inactive => reactivate
    const reactivated = await prisma.team.update({
      where: { id: existing.id }, // safest (name may be unique too, but id is universal)
      data: {
        isActive: true,
      },
      select: { id: true, name: true, isActive: true },
    });

    return {
      status: "success",
      data: {
        teamId: reactivated.id,
        name: reactivated.name,
        action: "reactivated",
      },
    };
  }

  const team = await prisma.team.create({
    data: {
      name: teamName,
      description: desc,
      isActive: true,
    },
  });

  return {
    status: "success",
    data: team,
  };
}