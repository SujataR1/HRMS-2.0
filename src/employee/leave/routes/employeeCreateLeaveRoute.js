import fp from "fastify-plugin";
import { employeeCreateLeave } from "../methods/employeeCreateLeave.js";
import { employeeCreateLeaveSchema } from "../schemas/employeeCreateLeaveSchema.js";

export default fp(async function employeeCreateLeaveRoute(fastify) {
	fastify.post("/employee/leave/apply", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "aX6HHuRQzKy17+nHdSypq+t9EGaeD4SM+rBZwltFTh+WeWFC83WOg5JB9O2IhpZ4BwxiS7PIE2XQ8Lua9YauyA==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCreateLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "dVxo9cUPAw/l+xhN28Lnke9gaclahTZeXQjXkPYDrMGQwE5Wbs3x8Tv68UUubqmQkTsGPiM23yQzAXGObgL5Tg==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCreateLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "5cFHuJ34awNNa76sdVcVnEIRhQGi9tKouVS1fa+BBLuPw7T03NDBydz5BGTyySssyopk91+xcqRlWBeYjZVTvA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				leaveId: result.leaveId,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to apply for leave");
			reply.header("x-auth-sign", "wImIgl8/rnGX4iqPQaiBwALWwml+5/jGM2XVlr5YsJbCXU8oGVilhuT/tNkOWUeySt52UNbAtXlQTJpWnqT34w==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not apply for leave",
			});
		}
	});
});
