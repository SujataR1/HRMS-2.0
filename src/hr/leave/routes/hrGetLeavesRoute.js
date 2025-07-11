import fp from "fastify-plugin";
import { hrGetLeaves } from "../methods/hrGetLeaves.js";
import { hrGetLeavesSchema } from "../schemas/hrGetLeavesSchema.js";

export default fp(async function hrGetLeavesRoute(fastify) {
	fastify.post("/hr/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "1/6c/xK17F3FjdzVXHJ+5rep2nz4hm5mXxKsB6/7TKDTIsohOiQ89CNxIiJnCZCf9tukXiv6WzAvzNCsNXVrag==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "HKDuAwInzAO36Zf9ejk593CZVTky+dInLCK9diqPE/EreXk5YRKwPD4aBblOFkt0veQMsrhpVSAXkwycqEUKSQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "nfLvvaH7p6H1ge7Wqu8qMgCC5JxhozM1n+S4UY2eX0rRSeLbPVhH0Mb/7Ow4WMp+8K4jbrkhF7pLOxGQEjx21w==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch leaves for HR");
			reply.header("x-auth-sign", "8G2cjmLdb3jSTtWIYMvdHrv0GODkAvef5Ix8YfDY17BFpUYTj1HGKReOpJbv8qdkp4L8BnQ7n/90zJQEt8WEvQ==");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});
