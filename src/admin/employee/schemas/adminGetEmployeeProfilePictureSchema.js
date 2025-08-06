import { z } from "zod";

export const adminGetEmployeeProfilePictureSchema = {
	body: z.object({
		employeeIds: z
			.array(
				z
					.string()
					.min(1, "Employee ID cannot be empty")
					.max(64, "Employee ID too long")
			)
			.min(1, "At least one employee ID is required"),
	}),
};
