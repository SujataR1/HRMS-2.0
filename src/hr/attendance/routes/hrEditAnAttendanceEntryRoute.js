import fp from "fastify-plugin";
import { hrEditAnAttendanceEntry } from "../methods/hrEditAnAttendanceEntry.js";
import { hrEditAnAttendanceEntrySchema } from "../schemas/hrEditAnAttendanceEntrySchema.js";

export default fp(async function hrEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/hr/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrEditAnAttendanceEntrySchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "90dfa1a4c2ba19138085abf8d2896d29 ||| 323820030f454bb7ca24e902983df842a5792571699f1d4487612fba4b9711437ec3cbe68e56163b62e8114a56d34dca");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrEditAnAttendanceEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "d35b8b83cd10f22a4b044b0a6e34acc7 ||| 82b52425351c28a4ab248fab452325107740d4fa88d6c9ebfd33323bab58fa98bc75a3c7af8bea535ea52dff3f623ea1");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry (HR)"
			);
			reply.header("x-auth-sign", "d68a25a936585e412b7d99803f9937a1 ||| 4b0e2e333f3b238a904147455464386ee50ee9d4ef9d552abbe35c31d0076a7721fd23b2a71bb6457e1d6ebaa46fb569");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});
