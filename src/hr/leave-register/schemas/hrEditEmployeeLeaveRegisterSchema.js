import { z } from "zod";

const allEditable = [
  "casualCurrent", "casualCarried", "casualTotal",
  "sickCurrent", "sickCarried", "sickTotal",
  "bereavementCurrent", "bereavementCarried", "bereavementTotal",
  "maternityCurrent", "maternityCarried", "maternityTotal",
  "paternityCurrent", "paternityCarried", "paternityTotal",
  "earnedCurrent", "earnedCarried", "earnedTotal",
  "compOffCurrent", "compOffCarried", "compOffTotal",
  "otherCurrent", "otherCarried", "otherTotal"
];

export const hrEditEmployeeLeaveRegisterSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  edits: z.array(
    z.object({
      field: z.enum(allEditable),
      mode: z.enum(["increment", "decrement", "reset"]),
      val: z.number().int().nonnegative().optional(),
    })
  ).min(1, "At least one edit must be specified"),
});
