import { z } from "zod";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export const hrCreateAHolidayEntrySchema = z.object({
	date: z.union([z.string(), z.date()]).refine(
		(val) => {
			const d =
				typeof val === "string"
					? dayjs.tz(val, TIMEZONE)
					: dayjs(val).tz(TIMEZONE);
			return d.isValid();
		},
		{
			message: "Invalid date format or unparseable date",
		}
	),
	name: z.string().trim().min(1, "Holiday name is required"),
	forShiftId: z.string().uuid().optional(),
});
