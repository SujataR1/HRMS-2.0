import { employeeGetProfile } from "../methods/employeeGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function employeeGetProfileRoute(fastify) {
	fastify.get("/employee/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "59c5404fe73bc419eda26fcb5c64b6a6 ||| c8db174e1ffffa185395730d67ba54af69a8d7b810edd42df3a7b10f732daef7c5ce263d65453f1bb40e1873419b871c");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await employeeGetProfile(authHeader);

			reply.header("x-auth-sign", "1496f3763df56f40c33eda8d798bbd8f ||| a90d85701abd923eb5144555c4e2e7f920426c1f7a3d1213a31e7d405173c8bc7873347c45a123227ed114f73411f461");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to get employee profile");

			reply.header("x-auth-sign", "625ca1f08a677f6c76023c816f8c43b8 ||| 0ba9265cb2425592dd78d25ba346877ba4e2e4797add1c8364ce98433b3a943f77663e9132ec993af83e698bd2621674");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch profile",
			});
		}
	});
});
