import { z } from "zod";

export const hrUploadEmployeeProfilePictureSchema = {
	body: z.object({
		employeeId: z.string()({
			message: "Please provide a valid employee ID.",
		}),
	}),
};
