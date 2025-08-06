import fp from "fastify-plugin";
import { adminGetEmployeeProfilePicture } from "../methods/adminGetEmployeeProfilePicture.js";
import { adminGetEmployeeProfilePictureSchema } from "../schemas/adminGetEmployeeProfilePictureSchema.js";

export default fp(async function adminGetEmployeeProfilePictureRoute(fastify) {
	fastify.post("/admin/employee/profile-pictures", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header(
					"x-auth-sign",
					"6c9cb70bfb98f64610262ad1edd21473 ||| bebdb027c16a5774b1e15e8cf31a87c68924b1ec724b332317eaddbc8d3171629ce032ddfbfa03711f97074d61b0b8cb"
				);
				return reply.code(401).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminGetEmployeeProfilePictureSchema.body.safeParse(request.body);

			if (!parsed.success) {
				reply.header(
					"x-auth-sign",
					"56de7f4e529d1bf74b570a668f88fd22 ||| 08d2a8faf11bc5b95ae04c6701c15498502fa1f0fd88d9e1600686f5dd8f933b4f817cea662f7d0f750e4eaeb9d258bb"
				);
				return reply.code(400).send({
					status: "error",
					message: "Invalid request body",
					errors: parsed.error.flatten().fieldErrors,
				});
			}

			const { employeeIds } = parsed.data;
			const results = await adminGetEmployeeProfilePicture(authHeader, employeeIds);

			reply.header(
				"x-auth-sign",
				"d41766d9bfeb1bf35a548205b21a8f0d ||| 73b0c3d48c258438b044a48f429e323d613dde72211c479106120449a98c23a49509d227e51bfa5b97cf22a69b5704b5"
			);
			return reply.code(200).send({
				status: "success",
				data: results,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Admin failed to fetch employee profile pictures");

			reply.header(
				"x-auth-sign",
				"3b496fbb7861a5878e47fa73860c654f ||| 88fb1380886035380ed514683f3018b32193b146cb7db315936632d7816f0f4664d5c55e59eb53132e76997b828bd9b9"
			);
			return reply.code(500).send({
				status: "error",
				message: error.message || "Internal server error",
			});
		}
	});
});
