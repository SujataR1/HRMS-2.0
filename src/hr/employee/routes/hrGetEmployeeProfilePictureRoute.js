import fp from "fastify-plugin";
import { hrGetEmployeeProfilePicture } from "../methods/hrGetEmployeeProfilePicture.js";
import { hrGetEmployeeProfilePictureSchema } from "../schemas/hrGetEmployeeProfilePictureSchema.js";

export default fp(async function hrGetEmployeeProfilePictureRoute(fastify) {
	fastify.post("/hr/employee/profile-pictures", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header(
					"x-auth-sign",
					"cf40262dbf04aaae67011d0c9a8f0a17 ||| 31d7f862c443c9ec8edaaaea0f39ed70f943a0f7a7cff32ffead65ebdc151993b9599bddca5249802ae57de199f6702c"
				);
				return reply.code(401).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = hrGetEmployeeProfilePictureSchema.body.safeParse(request.body);

			if (!parsed.success) {
				reply.header(
					"x-auth-sign",
					"770ae192d34e71d76473c914abb785f1 ||| 6f5ad205799f3362b439ea9f0c206be60a4a226a1e6bec028976435f79231d9b04f1cb297264476d56cab530cfa27986"
				);
				return reply.code(400).send({
					status: "error",
					message: "Invalid request body",
					errors: parsed.error.flatten().fieldErrors,
				});
			}

			const { employeeIds } = parsed.data;
			const results = await hrGetEmployeeProfilePicture(authHeader, employeeIds);

			reply.header(
				"x-auth-sign",
				"a9bb96d385c339fcca90ee1384a40818 ||| ce01930006f5dd684ef51cd299243cb44ae1055931869007819f7cc43e72b39933936bfcea5c3f9e077b5fd179b80528"
			);
			return reply.code(200).send({
				status: "success",
				data: results,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch HR employee profile pictures");

			reply.header(
				"x-auth-sign",
				"a1fd89e932f3242c0f3832cd39b84d06 ||| 47ee4847f978d1fc1807a912db38f6ed8faaa4eaf664bf81a0ae358eb37e959ea2027eddfe0f3c8d944eda98181f8c30"
			);
			return reply.code(500).send({
				status: "error",
				message: error.message || "Internal server error",
			});
		}
	});
});
