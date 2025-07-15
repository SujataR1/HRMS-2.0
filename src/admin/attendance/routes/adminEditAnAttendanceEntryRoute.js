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
				reply.header("x-auth-sign", "b268aad252f119daebf33b539d1334f7 ||| 64cbe29bd200d206c3778ee60f6fbf72afed71604738825c2b8ad7ff88024a9740e94770503e466d19f58712ee922afc");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminEditAnAttendanceEntry(
				authHeader,
				parsed.data
			);

			reply.header("x-auth-sign", "ee882c3630978ccf0c5fea8c4dab9b3a ||| 1367a6d46657d7339898f27a99382cbb010729c75dc5e921a6cd806524b887f47a756849939d1adb42c73adf0497c3f2");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry"
			);
			reply.header("x-auth-sign", "b2f87bdb4fbfbe4b5f9957f2894988e0 ||| 0d275d4157489c5d20a3c48191fa6d3df513b9c4504c055a592d3aad79bb38c8da1c7bfaf07411da7d312277035bbad2");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});
