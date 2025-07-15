import { hrCreateAHolidayEntry } from "../methods/hrCreateAHolidayEntry.js";
import { hrCreateAHolidayEntrySchema } from "../schemas/hrCreateAHolidayEntrySchema.js";

export default async function hrCreateAHolidayRoute(fastify) {
	fastify.post("/hr/holiday/create", async (req, res) => {
		try {
			const parsed = hrCreateAHolidayEntrySchema.safeParse(req.body);

			if (!parsed.success) {
				res.header("x-auth-sign", "d13837811d86561633a75572107ec1ed ||| aa4870a3951d05dfafb498f8fbb25922a874aaab2d9d6045769789bae8818453d591582367b0882abd332e7b76e3d2d6");

				return res.status(400).send({
					success: false,
					error: "Validation failed",
					detail: parsed.error.flatten(),
				});
			}

			const result = await hrCreateAHolidayEntry(parsed.data);
			res.header("x-auth-sign", "35b73d49771b53f7468ce11b01dd6774 ||| 5d47064917fe5d768e2643cfefaa918854dcb80e22e93a2838d5e075442b6f2bb395dc2219a376a95a6b1e743f0aa39b");

			return res.send({
				success: true,
				message: "Holiday entry created successfully",
				data: result.holiday,
			});
		} catch (err) {
			req.log.error(err, "[hrCreateAHolidayRoute]");
			res.header("x-auth-sign", "1c6c215cecdb3378694fdd61628b4ae4 ||| e5d4a9b6deb01f9545dcddafe0fd4846f2264a768d51ca8a9e49eb86c79dae02ac51198c8c20349c6a2adb197b372a42");

			return res.status(500).send({
				success: false,
				error: "Internal server error",
				detail: err.message,
			});
		}
	});
}
