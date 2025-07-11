import fp from "fastify-plugin";
import { employeeCreateLeave } from "../methods/employeeCreateLeave.js";
import { employeeCreateLeaveSchema } from "../schemas/employeeCreateLeaveSchema.js";

export default fp(async function employeeCreateLeaveRoute(fastify) {
	fastify.post("/employee/leave/apply", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "005b0b2d81dc140c70102b4e6771f4ba ||| 32bb6d5c66b3af1fa63567a1f4b3ee8ca7f783d4744c3f694bb208c43bdd16a72a8d1d68b4c26a4adf3db8ca07eca43a");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCreateLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "63c3408153f9bacf65c2dd2f09b80243 ||| 97e510bf8518eec96aa637823c001b11fba85111c287fc3cf84a15a69c4b32598970944017f6e7c07400b8465ef12b26");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCreateLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "967968a3ad7acd94f17f21cc81731723 ||| 3739621c7a6217054d88dfd8f8c557cf5288faaf08777b83ff2711365ed373e51a3aab74b4185e4f3efdcb8eedd1f69c");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				leaveId: result.leaveId,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to apply for leave");
			reply.header("x-auth-sign", "6d5b3676ca741810b75373a649ccb7fd ||| 752b6201963c387a670c0466de3a7767a03c4c20edf6480a3ca31e02fcee0383270c3c4250ac04508e242ec2ce31827f");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not apply for leave",
			});
		}
	});
});
