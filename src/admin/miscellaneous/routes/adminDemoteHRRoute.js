import fp from "fastify-plugin";
import { adminDemoteHR } from "../methods/adminDemoteHR.js";
import { adminDemoteHRSchema } from "../schemas/adminDemoteHRSchema.js";

export default fp(async function adminDemoteHRRoute(fastify) {
	fastify.post("/admin/demote-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			// Let verifyAdminJWT handle header validation
			const parsed = adminDemoteHRSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.header("x-auth-sign", "b8519af7ff1766f92d59ae4c14f1732b ||| d375a3c540396109174d982229c8c62ed734c7db1cc714b8c4aca7ad40c703caa2eb5fa81f0499ba33a4ea3be0f5d699");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminDemoteHR(
				authHeader,
				parsed.data.employeeId
			);

			reply.header("x-auth-sign", "691eaa195a330309b01952843766e841 ||| 2f21ff1f94b463c7a871a61e7d0b042cbafacd4c401c4bc167980de4acaabb41d933fad60885d18b39d7fc20e57cb3bd");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to demote HR");
			reply.header("x-auth-sign", "e9e7c4048b60dcccee4011573084b241 ||| 480fd70a41ade6e0be0f7cc3a368aff15cfd0a27f74ff50dbbf2d769167fdea7d83fd3b0bf77b62145ea95646e301059");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to demote HR",
			});
		}
	});
});
