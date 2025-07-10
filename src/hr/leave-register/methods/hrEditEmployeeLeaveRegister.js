import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

const VALID_CURRENT_FIELDS = [
  "casualCurrent",
  "sickCurrent",
  "bereavementCurrent",
  "maternityCurrent",
  "paternityCurrent",
  "earnedCurrent",
  "compOffCurrent",
  "otherCurrent",
];

export async function hrEditEmployeeLeaveRegister(authHeader, { employeeId, edits }) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const { hrId } = await verifyHrJWT(authHeader);
  const hr = await prisma.hr.findUnique({ where: { id: hrId } });
  if (!hr) throw new Error("HR account not found");

  const existing = await prisma.leaveRegister.findUnique({ where: { employeeId } });
  if (!existing) throw new Error("Leave register not found for this employee");

  const updates = {};

  for (const edit of edits) {
    const { field, mode, val } = edit;

    if (!VALID_CURRENT_FIELDS.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const currentVal = existing[field] ?? 0;

    if (mode === "increment") {
      if (typeof val !== "number" || val < 0) throw new Error(`Invalid increment value for ${field}`);
      updates[field] = currentVal + val;
    } else if (mode === "decrement") {
      if (typeof val !== "number" || val < 0) throw new Error(`Invalid decrement value for ${field}`);
      if (currentVal - val < 0) throw new Error(`Cannot decrement ${field} below 0`);
      updates[field] = currentVal - val;
    } else if (mode === "reset") {
      updates[field] = typeof val === "number" ? Math.max(val, 0) : 0;
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }
  }

  // Recalculate grandTotal
  updates.grandTotal = VALID_CURRENT_FIELDS.reduce(
    (sum, field) => sum + (updates[field] ?? existing[field] ?? 0),
    0
  );

  const updated = await prisma.leaveRegister.update({
    where: { employeeId },
    data: updates,
  });

  return {
    success: true,
    message: "Leave register updated successfully",
    updated,
  };
}
