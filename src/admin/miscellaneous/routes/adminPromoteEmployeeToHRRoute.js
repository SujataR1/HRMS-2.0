import fp from "fastify-plugin";
import { adminPromoteEmployeeToHR } from "../methods/adminPromoteEmployeeToHR.js";
import { adminPromoteEmployeeToHRSchema } from "../schemas/adminPromoteEmployeeToHRSchema.js";

export default fp(async function adminPromoteEmployeeToHRRoute(fastify) {
	fastify.post("/admin/promote-employee-to-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;
			if (!authHeader) {
				reply.header("x-auth-sign", "HAlnjGsN80XUHnZz47eYXTJM1zVIznddwdq6vQFZykdTQsxUe/7z/XK5tCHLcOYz2FuCUIezf2im9JnJuMGrzg==");
				return reply.code(401).send({
					status: "error",
					issues: "No Authorization Token in the Request",
				});
			}
			const parsed = adminPromoteEmployeeToHRSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "CuEyaMAYSgvjcZXywxbIhyVN5P72CbGwZTvAK64p8ia+CFvIrQlyFKrhcVoZp4MI1MTTXHmEkMPdVkOq9aaT2w==");
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

			reply.header("x-auth-sign", "BaB76D7b9YeiFEB4vtBoe8DIQpOJY8uDkwhI/OZh4K+UTFXhSLR0Sb2sw2cSF/Fw4P+JPEpHEE7qvZAvEmFzWw==");
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
			reply.header("x-auth-sign", "a1/ktJrAQWs4x7qf9OMo5WS8WzlMAYk1Slbp1vaLEgt0GeeQcEzAKDI0lmLd4Lwv/GNfAoj9DMFymNK7rO/o4A==");
			return reply.code(400).send({
				status: "error",
				message:
					error.message ||
					"Something went wrong while promoting employee to HR",
			});
		}
	});
});
