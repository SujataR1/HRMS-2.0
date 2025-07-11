import fp from "fastify-plugin";
import { employeeEditLeaveNotes } from "../methods/employeeEditLeaveNotes.js";
import { employeeEditLeaveNotesSchema } from "../schemas/employeeEditLeaveNotesSchema.js";

export default fp(async function employeeEditLeaveNotesRoute(fastify) {
	fastify.post("/employee/leave/edit-notes", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "w6VffV06u3G+vAEaDSPPKXcz4kDDSRvPAiYuMko/qNYDGqRoBKbR738ni4tvKThuT0zM9VwCEE3vSrYUnab9eA==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeEditLeaveNotesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "5LVM9Uw329EROLIXItlPwxLneggeYFn0rKdLT9VR8y/2Tm2X/ND91QUQ4lYtZrLbeedVeUV6cyY/srgv6dGWPQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeEditLeaveNotes(authHeader, parsed.data);

			reply.header("x-auth-sign", "o9oPlpj1IVBc9PgTNmxC/7H0WhG/n793F2i9/m+vChKoZCyYBQ6k2quP4ackt0DgjQMjHUbwHL6tTlbxfmHtUg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to edit leave notes");
			reply.header("x-auth-sign", "nqBZDpyCCKhQw+0JIqh5JHPYt5dHbXpR/J3MvuMObKv2LCtCbtOf6E8zUZtES5W42A3NezZSag6AJ65O5navGQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not update leave notes",
			});
		}
	});
});
