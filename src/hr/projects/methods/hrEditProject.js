import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrEditProject(authHeader, { projectId, name, description, status }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!projectId || typeof projectId !== "string") throw new Error("projectId is required");

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) throw new Error("name cannot be empty");
    const trimmed = name.trim();

    if (trimmed !== project.name) {
      const dup = await prisma.project.findUnique({ where: { name: trimmed } });
      if (dup) throw new Error(`Project "${trimmed}" already exists`);
    }
    data.name = trimmed;
  }

  if (description !== undefined) {
    if (description !== null && (typeof description !== "string" || !description.trim())) {
      throw new Error("description must be null or a non-empty string");
    }
    data.description = description;
  }

  if (status !== undefined) data.status = status;

  const updated = await prisma.project.update({ where: { id: projectId }, data });
  return { status: "success", data: updated };
}