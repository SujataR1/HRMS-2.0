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

  const existing = await prisma.team.findUnique({ where: { name: teamName } });
  if (existing) {
    throw new Error(`Team "${teamName}" already exists`);
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