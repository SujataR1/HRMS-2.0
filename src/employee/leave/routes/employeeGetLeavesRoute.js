import fp from "fastify-plugin";
import { employeeGetLeaves } from "../methods/employeeGetLeaves.js";
import { employeeGetLeavesSchema } from "../schemas/employeeGetLeavesSchema.js";

export default fp(async function employeeGetLeavesRoute(fastify) {
	fastify.post("/employee/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "b36c070ac44d5b5a7bd3743a838a60dc ||| 1050d762b92c73bb1b47b057a0e92b95b44eef8b0f34f0650f311512b69660defbe81b3e95b75c314170ff207829cbf6");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "9e1e028f6c4496435dcb7ea86585f771 ||| c8ab26628a8f27ecdbaac482ef701ea223a4a994ae95725db30dc1a2a7259cfbbce36cb0753e49e034007ac30a79e311");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "d42f9796e069a779c96796db3d9c3437 ||| b60573c9366e7aced02973d1a762c8626011b83407a6954717aa22ec53b4821ad5dfb0046d933ac5dd7abeb1d5eaafb5");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch employee leaves");
			reply.header("x-auth-sign", "4ee70b3af72a74013f9d798cd334a638 ||| d094b8eef169d6cbe7cc5c82127c21d5badd0dcda109e51242d2cdea587b105091a6470b836bbccf7fd32532bcbc1e96");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});
