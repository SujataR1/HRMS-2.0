import { z } from "zod";

const validFields = [
  "casualCurrent",
  "sickCurrent",
  "bereavementCurrent",
  "maternityCurrent",
  "paternityCurrent",
  "earnedCurrent",
  "compOffCurrent",
  "otherCurrent",
];

export const hrEditEmployeeLeaveRegisterSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  edits: z.array(
    z.object({
      field: z.enum(validFields),
      mode: z.enum(["increment", "decrement", "reset"]),
      val: z.number().int().nonnegative().optional(),
    })
  ).min(1, "At least one edit must be specified"),
});
