import fp from "fastify-plugin";
import { adminActOnUserInfraRequest } from "../methods/adminActOnUserInfraRequest.js";
import { adminActOnUserInfraRequestSchema } from "../schemas/adminActOnUserInfraRequestSchema.js";

export default fp(async function adminActOnUserInfraRequestRoute(fastify) {
	fastify.post("/admin/infra-requests/act", async (request, reply) => {
		const queryParsed =
			adminActOnUserInfraRequestSchema.shape.query.safeParse(
				request.query
			);
		const bodyParsed =
			adminActOnUserInfraRequestSchema.shape.body.safeParse(request.body);

		if (!queryParsed.success || !bodyParsed.success) {
			reply.header("x-auth-sign", "613c8a2693292678f84c1e23bea1c589 ||| c79f9c996de98dbbc11e21e248c509315984d666fc7b64a712186bf764f45eb2d400227fd129191046448b2d2dc87bb2");
			return reply.code(400).send({
				status: "error",
				issues: {
					query: !queryParsed.success
						? queryParsed.error.issues
						: undefined,
					body: !bodyParsed.success
						? bodyParsed.error.issues
						: undefined,
				},
			});
		}

		try {
			const result = await adminActOnUserInfraRequest({
				requestId: queryParsed.data.requestId,
				body: bodyParsed.data,
				authHeader: request.headers.authorization,
				meta: request.meta,
			});

			reply.header("x-auth-sign", "47b99a62780d927b211c80ffb2bfceba ||| 0b54a8023f4b535ef8df65da96d80811d1ebf4694c6551c20f2e7f60f4e43def53f02d376ca6a02af4801b5ce390eb02");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (err) {
			fastify.log.error(
				{ err },
				"❌ Failed to act on user infra request"
			);
			reply.header("x-auth-sign", "f73d0448a3f37be048287872b5018edf ||| 7f708980fd5b3c8cf68e369dc6ad68cacdc90945c93c42d5d940343b049a927126280a352c7533121181d48eed0309f0");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unhandled error",
			});
		}
	});
});
