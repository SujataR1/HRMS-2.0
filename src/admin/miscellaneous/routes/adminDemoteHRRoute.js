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
				reply.header("x-auth-sign", "eY37UAFCRr7w1LxWrZyxFbIG4bgb46JtJ1Ymyq8IC5zTGrAsX6Bc288vWIe3HBZ3X5LyM2Y2rdOPkp9RAUvGtw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminDemoteHR(
				authHeader,
				parsed.data.employeeId
			);

			reply.header("x-auth-sign", "x0/C9bF/Rr7YkFT19F7nVaWwNcAUu0pc+fdwpgj+QktDQLLwBL8nPdYN9mn2MczwC3wA1Cg8NJfZnpPdBKigbA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to demote HR");
			reply.header("x-auth-sign", "pIoWEAUeriI80zqXx4Zv3Fzk0oD7ktb1lKlmuiJryek/hb7go3WFH5Mx4THz+Z3Fzec0A4mjjqLoyM9bsW0f6A==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to demote HR",
			});
		}
	});
});
