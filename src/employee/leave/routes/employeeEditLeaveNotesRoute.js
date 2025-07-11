import fp from "fastify-plugin";
import { employeeEditLeaveNotes } from "../methods/employeeEditLeaveNotes.js";
import { employeeEditLeaveNotesSchema } from "../schemas/employeeEditLeaveNotesSchema.js";

export default fp(async function employeeEditLeaveNotesRoute(fastify) {
	fastify.post("/employee/leave/edit-notes", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "8cbcbf2ea77e410faa18abfbd6ac0609 ||| 0378f1aa2755a891c061f25338c94bc5dcc5d5529390f118f56ed8c53376b41aacf739cdcf7b12ab37064d6ee52dac05");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeEditLeaveNotesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "86bf758626904212bcc130ca2625b4ff ||| 403c4950d08437613e3c724fb30800914e7459fd9f8b4d04dded47674b450468175dd2bb1da10ab2747548b597c67ecf");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeEditLeaveNotes(authHeader, parsed.data);

			reply.header("x-auth-sign", "a2b8e339ab1109afd2786122452651a9 ||| be8473d140b384a6070c65c1ae6c0a4273d3fb017ead4007d921da3b7b0327c9d9107f44a5ba809d36c6691293dd9611");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to edit leave notes");
			reply.header("x-auth-sign", "b1d84614f67527ec0e88c9b2706dd048 ||| d00f42a15c566cd9b120aa4f449f1a523ecd7c027c902a2e1a163d22c56e4d7d03b7185671b24f9fe6026c6ce7e95a9e");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not update leave notes",
			});
		}
	});
});
