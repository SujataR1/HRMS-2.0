import fp from "fastify-plugin";
import { adminEditAnAttendanceEntry } from "../methods/adminEditAnAttendanceEntry.js";
import { adminEditAnAttendanceEntrySchema } from "../schemas/adminEditAnAttendanceEntrySchema.js";

export default fp(async function adminEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/admin/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = adminEditAnAttendanceEntrySchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "8f63891265b95e33782ec04ce8fd38e5 ||| db9b0e21008312a43ebeeda68c1a56b8ed9cce66fb0d1b32c44300c42960fecd8c0f6ba9d5d3caf558ea66ba009748e8");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminEditAnAttendanceEntry(
				authHeader,
				parsed.data
			);

			reply.header("x-auth-sign", "63dbc546a0b07e5d6f5fe516d52e81ac ||| 8f177013c0ccbc3f92ccbc8782308a9ad638f28740716747e8adc4e7bf3ea3125b0009b00b4eb39a4530b2f29c210d90");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry"
			);
			reply.header("x-auth-sign", "7a941db6d2f11bcaea0be30312422024 ||| 772dc8e8564149c124b3525196f78d3c82b96d88ae4ff85a17a973fa7aeb2619ec21edd9dab81771bada5e36b60091df");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});
