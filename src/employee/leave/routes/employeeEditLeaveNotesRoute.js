import fp from "fastify-plugin";
import { employeeEditLeaveNotes } from "../methods/employeeEditLeaveNotes.js";
import { employeeEditLeaveNotesSchema } from "../schemas/employeeEditLeaveNotesSchema.js";

export default fp(async function employeeEditLeaveNotesRoute(fastify) {
	fastify.post("/employee/leave/edit-notes", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "2fb960c263041cf9542bb1abd99cdbf7 ||| 74e296023bedf433cbf38c4c9d06ff60df0d4e3dc59da93d6e2270116e5ee64d9ef5c4f0095f1b4a01e127ac057f53e8");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeEditLeaveNotesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "8c563b74ac8aba8a420993bfddfb122e ||| 0c53bf26de2a23fe42f22f075b6718503580f28d76eaf1b2c9bd247442e88e39b5bbfe697567401e0bafea667f79a2fe");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeEditLeaveNotes(authHeader, parsed.data);

			reply.header("x-auth-sign", "27250f46afe468450166d7cd5e84734c ||| 243ce271d99a05485a4116ca3af365a7713854ce1371e6283bb89473ae702f0f4c42823267b715bad95cc676d69a4d00");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to edit leave notes");
			reply.header("x-auth-sign", "208f47ad4170a39bc012a20a8999ce4f ||| 7c6a73d40fab86c059c1a479e102ebe09b11db936336831c3d01fb2568196507426cb0d145532d709fd6fe7e333a6a17");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not update leave notes",
			});
		}
	});
});
