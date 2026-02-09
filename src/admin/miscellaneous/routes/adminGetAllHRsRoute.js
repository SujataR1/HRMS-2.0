// src/admin/employee/routes/adminGetAllHRsRoute.js
import fp from "fastify-plugin";
import { adminGetAllHRs } from "../methods/adminGetAllHRs.js";

export default fp(async function adminGetAllHRsRoute(fastify) {
	fastify.get("/admin/get-all-hrs", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;
			if (!authHeader) {
				reply.header(
					"x-auth-sign",
					"6b6743b290bd19006cb9de6632be5793 ||| 2a9d2f390729180e235e918e48b91bd4143144eecf467e7666161a88aa06f150e21ca965be02e6d9a4ed64550a194db1"
				);
				return reply.code(401).send({
					status: "error",
					issues: "No Authorization Token in the Request",
				});
			}

			const result = await adminGetAllHRs(authHeader);

			reply.header(
				"x-auth-sign",
				"f8d3b763e4df585837d84ca792584690 ||| 56ec158f3e887e2f0ff73583972fd54f3f3703d163db61809d259f38e497cb9f43540e3d0768a3404f87e886daec3a58"
			);
			return reply.code(200).send({
				status: "success",
				message: result.message,
				data: result.data, // { employees: [...], count: n }
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch all HRs");
			reply.header(
				"x-auth-sign",
				"2b78ec6918b04d0d2e55c75e1325134c ||| de045065326f1c0d20be7b95dec156e77553b6f9623c8751a3f1cc44ec703fde8b5ac9f5608219ed39688c13144f25d2"
			);
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Something went wrong while fetching HRs",
			});
		}
	});
});