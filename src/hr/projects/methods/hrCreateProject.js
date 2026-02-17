import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrCreateProject(authHeader, { name, description, status }) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  if (!name || typeof name !== "string" || !name.trim()) throw new Error("Project name is required");

  const projectName = name.trim();
  const desc = description === undefined ? null : description;
  const st = status ?? "planned";

  const existing = await prisma.project.findUnique({ where: { name: projectName } });
  if (existing) throw new Error(`Project "${projectName}" already exists`);

  const project = await prisma.project.create({
    data: { name: projectName, description: desc, status: st },
  });

  return { status: "success", data: project };
}