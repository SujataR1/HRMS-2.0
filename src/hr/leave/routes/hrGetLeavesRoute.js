import fp from "fastify-plugin";
import { hrGetLeaves } from "../methods/hrGetLeaves.js";
import { hrGetLeavesSchema } from "../schemas/hrGetLeavesSchema.js";

export default fp(async function hrGetLeavesRoute(fastify) {
	fastify.post("/hr/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "f9f179ebb6ac4841b660e8371e39a905 ||| 5e020aad641d0419c2ea409c1590bca6df986105d5509ccf093514e047eeba5a1174e42f21e41b0e80ae29abb54e2f31");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "90d302c241f1df6bf47dea951f0705ab ||| 45e85a5250da586e5c3c365001fb67596a50312dc1462fcf8dcc893999a2dec25f71bcefa22428792e128a9043a4eb3c");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "ef8020c59b96c52458adcb50cf87238e ||| ff21858be45fc96fe10ec30b8dd4be5e2acbdb2dc91f10ad15d93dfeddef8feb494a6e464379452c4a41166d100d901a");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch leaves for HR");
			reply.header("x-auth-sign", "83940ea6d11d7bb0a61f9ed4e3a4e8cb ||| 4a01ab302bf6f0dad911f95229382c2ecb3be7a7150463c5b61fee6ed808f5ef4d081b2a1d114d95291cdd1a2b9484d7");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});
