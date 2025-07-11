import fp from "fastify-plugin";
import { adminGetUserInfraRequests } from "../methods/adminGetUserInfraRequests.js";
import { adminGetUserInfraRequestsSchema } from "../schemas/adminGetUserInfraRequestsSchema.js";

export default fp(async function adminGetAllUserInfraRequestsRoute(fastify) {
	fastify.get("/admin/get-infra-requests", async (request, reply) => {
		try {
			const parsed = adminGetUserInfraRequestsSchema.safeParse({
				query: request.query,
			});

			if (!parsed.success) {
				reply.header("x-auth-sign", "a7IDyJzByIq39lG8fGplKUbZnr/yhNPXkWAh7tD7MXBmzkiccEWcXkG7ZaFGDRalShKSnDQBtYukBOdemaDM7w==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "MED1H7mweiX0I5zOQeuUBuptpcG/RD2DyFm0mEgSDTbqVvFR9BGShVkC0biLJxuWVGSNvYfupo3V0y7QwgHWZw==");
				return reply.code(401).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminGetUserInfraRequests({
				authHeader,
				limit: parsed.data.query.limit,
				meta: request.meta || {},
			});

			reply.header("x-auth-sign", "pJ16wXNlSjb8s6hY02lAyq0IEcqbvhkA76vuCC14+c/F2CgbdRN5ofQ0CUZGbn4HMtJtf+SMU7fu5GKbNTtLeQ==");
			return reply.code(200).send({
				status: "success",
				...result,
			});
		} catch (err) {
			fastify.log.error({ err }, "❌ Failed to get infra requests");
			reply.header("x-auth-sign", "QkPdnevdyKZC4VuDzFHqyU8OZaVBee2aDHpc3jbYqOkOiGTlTkHTMEn6hfHhOAZmD5xLxeCAfHxBEbd7bi5M6A==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Unknown server error",
			});
		}
	});
});
