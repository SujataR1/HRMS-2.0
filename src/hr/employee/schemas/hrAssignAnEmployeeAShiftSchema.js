import { z } from "zod";

export const hrAssignAnEmployeeAShiftSchema = z.object({
	employeeId: z.string().min(1),
	shiftId: z.string().min(1),
});
