import fp from "fastify-plugin";
import { employeeGetLeaves } from "../methods/employeeGetLeaves.js";
import { employeeGetLeavesSchema } from "../schemas/employeeGetLeavesSchema.js";

export default fp(async function employeeGetLeavesRoute(fastify) {
	fastify.post("/employee/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "LkUyeA/opTFqauHfQTVN7e7Ch27rmdsgGUFnuRTdveiY0RHRbmioKKgPJ95CuQ8KSddMGnY8eI585vMpt4y1ZQ==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "Cmng6pnYKusZ4UFXe+g+v6uRRGhjT9SGYol5LzCCAz84Z7E9aziIOlnPPX4JrFPTr5jDL2A+vBkyQlHm/DR+cg==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "osT3DLT3UboufH/UyATNZDVsVB99uLK8LWdY4OELW8k0dndRWABY8i0gA2U5ijwmDm95Zt/x5JrSd1O736L2Ng==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch employee leaves");
			reply.header("x-auth-sign", "M2ObpxlJIuB4GkHK/cI8FXB6zQDwRhy+AKGEtWc5pDk3twTzvhNnc/44Opymd0LsUkxDuAy52OB7ZiUzMaXFUQ==");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});
