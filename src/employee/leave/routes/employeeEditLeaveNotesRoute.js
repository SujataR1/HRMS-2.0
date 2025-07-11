import fp from "fastify-plugin";
import { employeeEditLeaveNotes } from "../methods/employeeEditLeaveNotes.js";
import { employeeEditLeaveNotesSchema } from "../schemas/employeeEditLeaveNotesSchema.js";

export default fp(async function employeeEditLeaveNotesRoute(fastify) {
	fastify.post("/employee/leave/edit-notes", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeEditLeaveNotesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeEditLeaveNotes(authHeader, parsed.data);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to edit leave notes");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not update leave notes",
			});
		}
	});
});
