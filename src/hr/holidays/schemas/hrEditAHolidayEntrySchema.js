import { z } from "zod";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export const hrEditAHolidayEntrySchema = z
	.object({
		holidayId: z
			.string({ required_error: "Holiday ID is required" })
			.uuid("Invalid Holiday ID format"),

		name: z.string().min(1, "Name cannot be empty").optional(),

		date: z
			.preprocess(
				(val) => {
					if (typeof val !== "string") return undefined;
					const parsed = dayjs.tz(val, TIMEZONE);
					return parsed.isValid() ? parsed : undefined;
				},
				z.instanceof(dayjs).optional().refine((d) => d.isValid(), {
					message: "Invalid date",
				})
			),

		forShiftId: z.string().uuid("Invalid Shift ID").nullable().optional(),

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
