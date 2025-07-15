import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

const ALL_EDITABLE_FIELDS = [
  "casualCurrent", "casualCarried", "casualTotal",
  "sickCurrent", "sickCarried", "sickTotal",
  "bereavementCurrent", "bereavementCarried", "bereavementTotal",
  "maternityCurrent", "maternityCarried", "maternityTotal",
  "paternityCurrent", "paternityCarried", "paternityTotal",
  "earnedCurrent", "earnedCarried", "earnedTotal",
  "compOffCurrent", "compOffCarried", "compOffTotal",
  "otherCurrent", "otherCarried", "otherTotal"
];

const CURRENT_FIELDS_ONLY = ALL_EDITABLE_FIELDS.filter(f => f.endsWith("Current"));

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

    if (!ALL_EDITABLE_FIELDS.includes(field)) {
      throw new Error(`Invalid editable field: ${field}`);
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

  // Recalculate grandTotal using current fields only
  updates.grandTotal = CURRENT_FIELDS_ONLY.reduce(
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
