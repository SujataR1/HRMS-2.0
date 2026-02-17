import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function hrGetAllProjects(authHeader, { status } = {}) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) throw new Error("Authorization header missing or invalid");

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR not found");

  const where = {};
  if (status) where.status = status;

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return { status: "success", data: projects };
}