import { hrCreateAHolidayEntry } from "../methods/hrCreateAHolidayEntry.js";
import { hrCreateAHolidayEntrySchema } from "../schemas/hrCreateAHolidayEntrySchema.js";

export default async function hrCreateAHolidayRoute(fastify) {
	fastify.post("/hr/holiday/create", async (req, res) => {
		try {
			const parsed = hrCreateAHolidayEntrySchema.safeParse(req.body);

			if (!parsed.success) {
				res.header("x-auth-sign", "860c2abe20db9934ecf9083b8f31e624 ||| 3a6bb3c49e6142027331958963c99d5a86410a94b70992d854ccdf0a54f9677c80cb435eadcb5c8eafa9d8e5370d040d");

				return res.status(400).send({
					success: false,
					error: "Validation failed",
					detail: parsed.error.flatten(),
				});
			}

			const result = await hrCreateAHolidayEntry(parsed.data);
			res.header("x-auth-sign", "860c2abe20db9934ecf9083b8f31e624 ||| 3a6bb3c49e6142027331958963c99d5a86410a94b70992d854ccdf0a54f9677c80cb435eadcb5c8eafa9d8e5370d040d");

			return res.send({
				success: true,
				message: "Holiday entry created successfully",
				data: result.holiday,
			});
		} catch (err) {
			req.log.error(err, "[hrCreateAHolidayRoute]");
			res.header("x-auth-sign", "860c2abe20db9934ecf9083b8f31e624 ||| 3a6bb3c49e6142027331958963c99d5a86410a94b70992d854ccdf0a54f9677c80cb435eadcb5c8eafa9d8e5370d040d");

			return res.status(500).send({
				success: false,
				error: "Internal server error",
				detail: err.message,
			});
		}
	});
}
