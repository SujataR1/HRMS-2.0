import { z } from "zod";

export const hrEditAHolidayEntrySchema = z
	.object({
		holidayId: z
			.string({ required_error: "Holiday ID is required" })
			.uuid("Invalid Holiday ID format"),

		name: z
			.string()
			.min(1, "Name cannot be empty")
			.optional(),

		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format (UTC)")
			.optional(),

		forShiftId: z
			.string()
			.uuid("Invalid Shift ID")
			.nullable()
			.optional(),

		isActive: z.boolean().optional(),
	})
	.refine(
		(data) =>
			data.name !== undefined ||
			data.date !== undefined ||
			data.forShiftId !== undefined ||
			data.isActive !== undefined,
		{
			message: "At least one field to update must be provided",
		}
	);
