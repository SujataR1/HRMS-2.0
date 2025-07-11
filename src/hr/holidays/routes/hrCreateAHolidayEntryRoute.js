import { hrCreateAHolidayEntry } from "../methods/hrCreateAHolidayEntry.js";
import { hrCreateAHolidayEntrySchema } from "../schemas/hrCreateAHolidayEntrySchema.js";

export default async function hrCreateAHolidayRoute(fastify) {
	fastify.post("/hr/holiday/create", async (req, res) => {
		try {
			const parsed = hrCreateAHolidayEntrySchema.safeParse(req.body);

			if (!parsed.success) {
				res.header("x-auth-sign", "wMg3BFOnoVic9oe0u+Elmchm6Seb+cWsoXzsOAghMFllPS4wg5C0JGUPm0kbaQjuIYL9juKfdtRstEGejnKr2Q==");

				return res.status(400).send({
					success: false,
					error: "Validation failed",
					detail: parsed.error.flatten(),
				});
			}

			const result = await hrCreateAHolidayEntry(parsed.data);
			res.header("x-auth-sign", "wMg3BFOnoVic9oe0u+Elmchm6Seb+cWsoXzsOAghMFllPS4wg5C0JGUPm0kbaQjuIYL9juKfdtRstEGejnKr2Q==");

			return res.send({
				success: true,
				message: "Holiday entry created successfully",
				data: result.holiday,
			});
		} catch (err) {
			req.log.error(err, "[hrCreateAHolidayRoute]");
			res.header("x-auth-sign", "wMg3BFOnoVic9oe0u+Elmchm6Seb+cWsoXzsOAghMFllPS4wg5C0JGUPm0kbaQjuIYL9juKfdtRstEGejnKr2Q==");

			return res.status(500).send({
				success: false,
				error: "Internal server error",
				detail: err.message,
			});
		}
	});
}
