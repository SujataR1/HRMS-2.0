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
				reply.header("x-auth-sign", "1MfRiJzDiYWTeoQOpH11RlKl9KDaTn+wUHcWr3nDRku+M22Z2ugEgysFsa1pGF6j0nvVhzzFvc63sDcXeymczA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminDemoteHR(
				authHeader,
				parsed.data.employeeId
			);

			reply.header("x-auth-sign", "0WKYcIBDdrrRHfMHE41npU9AfNypUBY9bP4PkN18Xw+GDYQmTcVTTnS/LYQOHp4YwQ+NF6JgUh7QBO5th291ug==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to demote HR");
			reply.header("x-auth-sign", "cRJ+jhz3DNh1XzrrqyGstoKgbdNitiF4P+gQug5IMk+57hCfgl3mGEBusVneS6VIYk3nNEQ4Fe4mEnIKXvOgPA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to demote HR",
			});
		}
	});
});
