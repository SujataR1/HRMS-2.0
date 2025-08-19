import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";
const prisma = new PrismaClient();

const ALLOWED_PAYMENT_STATUSES = ["PAID", "UNPAID", "LOP", "COMP_OFF"];
const CONFLICTING_COMBOS = [
  ["PAID", "UNPAID"],
  ["PAID", "LOP"],
  ["COMP_OFF", "UNPAID"],
  ["COMP_OFF", "LOP"],
];

function toUpperArray(arr = []) {
  return Array.from(new Set(arr.map((s) => String(s).toUpperCase().trim()))).filter(Boolean);
}

function hasConflict(paymentStatuses) {
  return CONFLICTING_COMBOS.some((combo) => combo.every((s) => paymentStatuses.includes(s)));
}

/**
 * Pure edit of payment statuses (no toggle semantics).
 * - Requires HR auth (Bearer token)
 * - Only allowed when leave.status === "approved"
 * - Applies: (current - statusRemove) ∪ statusAdd
 * - Validates forbidden combos after edit
 *
 * @param {string} authHeader "Bearer <JWT>"
 * @param {{ leaveId: string, statusAdd?: string[], statusRemove?: string[] }} params
 * @returns {{ success: true, message: string, data: { leaveId: string, previousStatuses: string[], newStatuses: string[] } }}
 */
export async function hrEditLeavePaymentStatuses(authHeader, { leaveId, statusAdd = [], statusRemove = [] }) {
  // 1) Auth
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or invalid");
  }
  await verifyHrJWT(authHeader);

  // 2) Basic input validation
  if (!leaveId || typeof leaveId !== "string") {
    throw new Error("Invalid leaveId");
  }

  const add = toUpperArray(statusAdd);
  const remove = toUpperArray(statusRemove);

  if (add.length === 0 && remove.length === 0) {
    throw new Error("Provide at least one of statusAdd or statusRemove");
  }

  // Validate allowed values
  for (const s of [...add, ...remove]) {
    if (!ALLOWED_PAYMENT_STATUSES.includes(s)) {
      throw new Error(`Invalid payment status: ${s}`);
    }
  }

  // Disallow overlapping asks (pointless/ambiguous)
  const overlap = add.filter((s) => remove.includes(s));
  if (overlap.length) {
    throw new Error(`Same status present in both statusAdd and statusRemove: ${overlap.join(", ")}`);
  }

  // 3) Fetch leave
  const leave = await prisma.leave.findFirst({
    where: { id: leaveId },
    select: { id: true, status: true, leaveType: true },
  });

  if (!leave) {
    throw new Error("Leave not found");
  }

  // 4) Enforce only approved leaves are editable
  if (leave.status !== "approved") {
    throw new Error("Payment statuses can only be changed for approved leaves");
  }

  // 5) Compute new set
  const prev = Array.isArray(leave.leaveType) ? leave.leaveType.map((s) => String(s).toUpperCase()) : [];
  const currentSet = new Set(prev);

  // Remove first
  for (const s of remove) currentSet.delete(s);
  // Then add
  for (const s of add) currentSet.add(s);

  const next = Array.from(currentSet);

  // 6) Validate forbidden combos after applying
  if (hasConflict(next)) {
    throw new Error("Conflicting payment statuses selected after edit");
  }

  // Extra guard: if COMP_OFF exists, it must not co-exist with UNPAID or LOP (already covered above)
  if (next.includes("COMP_OFF") && (next.includes("UNPAID") || next.includes("LOP"))) {
    throw new Error("COMP_OFF cannot be combined with UNPAID or LOP");
  }

  // 7) Persist
  await prisma.leave.update({
    where: { id: leaveId },
    data: {
      leaveType: next,
      // If you maintain audit fields, uncomment and ensure columns exist:
      // paymentStatusUpdatedAt: dayjs().tz(TIMEZONE).toDate(),
      // paymentStatusUpdatedBy: <hrId from verify if you expose it>,
    },
  });

  return {
    success: true,
    message: `Payment statuses updated for leave ${leaveId}`,
    data: {
      leaveId,
      previousStatuses: prev,
      newStatuses: next,
    },
  };
}
