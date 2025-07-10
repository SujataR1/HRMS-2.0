import { z } from "zod";

export const hrCreateEmployeeLeaveRegisterSchema = z.object({
	employeeId: z
		.string({ required_error: "Employee ID is required" })
		.min(1, "Employee ID cannot be empty"),

	// Only current fields are accepted — carried & total not allowed in payload
	casualCurrent: z.number().int().min(0).optional(),
	sickCurrent: z.number().int().min(0).optional(),
	bereavementCurrent: z.number().int().min(0).optional(),
	maternityCurrent: z.number().int().min(0).optional(),
	paternityCurrent: z.number().int().min(0).optional(),
	earnedCurrent: z.number().int().min(0).optional(),
	compOffCurrent: z.number().int().min(0).optional(),
	otherCurrent: z.number().int().min(0).optional(),
});
