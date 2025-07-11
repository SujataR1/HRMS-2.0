import fp from "fastify-plugin";
import { adminPromoteEmployeeToHR } from "../methods/adminPromoteEmployeeToHR.js";
import { adminPromoteEmployeeToHRSchema } from "../schemas/adminPromoteEmployeeToHRSchema.js";

export default fp(async function adminPromoteEmployeeToHRRoute(fastify) {
	fastify.post("/admin/promote-employee-to-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;
			if (!authHeader) {
				reply.header("x-auth-sign", "6b6743b290bd19006cb9de6632be5793 ||| 2a9d2f390729180e235e918e48b91bd4143144eecf467e7666161a88aa06f150e21ca965be02e6d9a4ed64550a194db1");
				return reply.code(401).send({
					status: "error",
					issues: "No Authorization Token in the Request",
				});
			}
			const parsed = adminPromoteEmployeeToHRSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "36daac83c0b234562230627615b2f00f ||| d6a5c7f1a5d4adb0bcbd3a4c8cf8091f3eb72d7ac140789fbfa061df46a71474b18a94b609a30732a0ee2f74f049c1a3");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminPromoteEmployeeToHR(
				authHeader,
				parsed.data.employeeId,
				parsed.data.customPassword || null
			);

			reply.header("x-auth-sign", "f8d3b763e4df585837d84ca792584690 ||| 56ec158f3e887e2f0ff73583972fd54f3f3703d163db61809d259f38e497cb9f43540e3d0768a3404f87e886daec3a58");
			return reply.code(201).send({
				status: "success",
				message: result.message,
				data: {
					hrId: result.hrId,
					email: result.email,
					...(result.tempPassword && {
						tempPassword: result.tempPassword,
						note: result.note,
					}),
				},
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to promote employee to HR"
			);
			reply.header("x-auth-sign", "2b78ec6918b04d0d2e55c75e1325134c ||| de045065326f1c0d20be7b95dec156e77553b6f9623c8751a3f1cc44ec703fde8b5ac9f5608219ed39688c13144f25d2");
			return reply.code(400).send({
				status: "error",
				message:
					error.message ||
					"Something went wrong while promoting employee to HR",
			});
		}
	});
});
