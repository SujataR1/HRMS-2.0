import { hrCreateAHolidayEntry } from "../methods/hrCreateAHolidayEntry.js";
import { hrCreateAHolidayEntrySchema } from "../schemas/hrCreateAHolidayEntrySchema.js";

export default async function hrCreateAHolidayRoute(fastify) {
	fastify.post("/hr/holiday/create", async (req, res) => {
		try {
			const parsed = hrCreateAHolidayEntrySchema.safeParse(req.body);

			if (!parsed.success) {
				return res.status(400).send({
					success: false,
					error: "Validation failed",
					detail: parsed.error.flatten(),
				});
			}

			const result = await hrCreateAHolidayEntry(parsed.data);

			return res.send({
				success: true,
				message: "Holiday entry created successfully",
				data: result.holiday,
			});
		} catch (err) {
			req.log.error(err, "[hrCreateAHolidayRoute]");
			return res.status(500).send({
				success: false,
				error: "Internal server error",
				detail: err.message,
			});
		}
	});
}
