import { prisma } from "#src/db/prisma.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
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