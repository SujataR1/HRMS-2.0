import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrEditTeam(authHeader, { teamId, name, description, isActive }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!teamId || typeof teamId !== "string") throw new Error("teamId is required");

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error("Team not found");

  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) throw new Error("name cannot be empty");
    const trimmed = name.trim();
    if (trimmed !== team.name) {
      const dup = await prisma.team.findUnique({ where: { name: trimmed } });
      if (dup) throw new Error(`Team "${trimmed}" already exists`);
    }
    data.name = trimmed;
  }

  if (description !== undefined) {
    if (description !== null && (typeof description !== "string" || !description.trim())) {
      throw new Error("description must be null or a non-empty string");
    }
    data.description = description;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") throw new Error("isActive must be boolean");
    data.isActive = isActive;
  }

  const updated = await prisma.team.update({
    where: { id: teamId },
    data,
  });

  return { status: "success", data: updated };
}