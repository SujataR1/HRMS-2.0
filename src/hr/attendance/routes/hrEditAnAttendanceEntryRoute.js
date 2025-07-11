import fp from "fastify-plugin";
import { hrEditAnAttendanceEntry } from "../methods/hrEditAnAttendanceEntry.js";
import { hrEditAnAttendanceEntrySchema } from "../schemas/hrEditAnAttendanceEntrySchema.js";

export default fp(async function hrEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/hr/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrEditAnAttendanceEntrySchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "c282c378bd1d816465c96a3d91d6121a ||| 68986b84dd9e85c5a25e81a211eab1b7dab11a6473baabc4ac4c99da72e88a6cfeeebefb417c3ac7f51e9470e6f02fcf");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrEditAnAttendanceEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "0150d0e5504771d25ed7b10eea3b305f ||| 25fd5fe2f5a24005ff5b038819c4c7931984cc121b3e0d5f1a8fd0207fd1b50264d567d46b0d72f35bee5ea03f00a57c");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry (HR)"
			);
			reply.header("x-auth-sign", "a1622cd7452535be5e9db3779238601c ||| 61386768115a7b798839791c5dda7faee24e43f79b1811cc744323a465b4684740f0dc61ae3b1b0939ea07fe00915c82");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});
