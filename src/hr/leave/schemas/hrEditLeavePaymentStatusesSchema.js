import { z } from "zod";

const PaymentStatuses = ["PAID", "UNPAID", "LOP", "COMP_OFF"];
const ConflictingCombos = [
  ["PAID", "UNPAID"],
  ["PAID", "LOP"],
  ["COMP_OFF", "UNPAID"],
  ["COMP_OFF", "LOP"],
];

export const hrEditLeavePaymentStatusesSchema = z
  .object({
    leaveId: z
      .string({ required_error: "leaveId is required" })
      .uuid("Invalid leave ID"),

    statusAdd: z.array(z.enum(PaymentStatuses)).optional().default([]),
    statusRemove: z.array(z.enum(PaymentStatuses)).optional().default([]),
  })
  .superRefine((data, ctx) => {
    // Require at least one non-empty array
    if ((!data.statusAdd || data.statusAdd.length === 0) && (!data.statusRemove || data.statusRemove.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of statusAdd or statusRemove must be provided",
        path: ["statusAdd", "statusRemove"],
      });
    }

    // Disallow overlap between add & remove
    const overlap = data.statusAdd.filter((s) => data.statusRemove.includes(s));
    if (overlap.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Same status present in both statusAdd and statusRemove: ${overlap.join(", ")}`,
        path: ["statusAdd", "statusRemove"],
      });
    }

    // Check for conflicts in the add list alone (prevent bad combinations being added at once)
    for (const combo of ConflictingCombos) {
      if (combo.every((s) => data.statusAdd.includes(s))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Conflicting payment statuses in statusAdd: ${combo.join(" + ")}`,
          path: ["statusAdd"],
        });
      }
    }
  });
