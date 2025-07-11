import fp from "fastify-plugin";
import { employeeEditLeaveNotes } from "../methods/employeeEditLeaveNotes.js";
import { employeeEditLeaveNotesSchema } from "../schemas/employeeEditLeaveNotesSchema.js";

export default fp(async function employeeEditLeaveNotesRoute(fastify) {
	fastify.post("/employee/leave/edit-notes", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "143d8KNHrK93Z6DJK+IlWvfz+VAQ63LlOAAI7hn6NZbkb3iKw8YMMfDLdGe2kPAXZK9EfJFXsEwNYjJrtEMNMw==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeEditLeaveNotesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "q1GiKg6TOOdL4VmGgsicD4ekbVqe+e5naQd7YtxZPAFfMvvGKS6kcgSp6NVa5EE81gYjzNAIfrg/2mp/Us6Phw==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeEditLeaveNotes(authHeader, parsed.data);

			reply.header("x-auth-sign", "ALyvjdBN/2BZF5I0uUmaddql+MpDG6vmmdJ8ONKMWcOmVtfUwRvp3WKbhqoAwhHd+XPP/DrahP55WQxbtg+YCw==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to edit leave notes");
			reply.header("x-auth-sign", "ofdhi6dpn0ixFzU6wt6LQrCQ/0bZWhXCmeJEHrjbotchbxhu7xlJZFGcTMcuQVEw1NhqQEFpiIfBoEnrbaLlvQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not update leave notes",
			});
		}
	});
});
