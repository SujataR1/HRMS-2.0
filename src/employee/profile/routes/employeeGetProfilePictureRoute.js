import fp from "fastify-plugin";
import { employeeGetProfilePicture } from "../methods/employeeGetProfilePicture.js";

export default fp(async function employeeGetProfilePictureRoute(fastify) {
	fastify.get("/employee/profile-picture", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header(
					"x-auth-sign",
					"b26ab21abca62cb2a36f39d160042b8c ||| 980d8338fc9d7acfbd362d59e06a3c6553101819e9c077bf07e5d9a1758c6e9230b97fc4de733daeeb1a4d4c792459ca"
				);
				return reply.code(401).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profilePic = await employeeGetProfilePicture(authHeader);

			reply.header(
				"x-auth-sign",
				"13601cd204f2cc73194d22cc1de2054c ||| 0fe0f6fb366f358f57f3aa8a134514e91fb6d80bb60615e39f521633847219d40c3cfb51be64ef661a2f645a076a7cc4"
			);
			return reply.code(200).send({
				status: "success",
				data: profilePic, // null or base64 string
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to get profile picture");

			reply.header(
				"x-auth-sign",
				"f37a414e19510d3ffc33b42d90b66920 ||| aba833dbead8f0f3cdb43810b1921fc78eece3baeddab746fc342c00dffd5e6f24e7ffc6deea37ca7d44affb6343b53f"
			);
			return reply.code(500).send({
				status: "error",
				message: error.message || "Something went wrong while fetching profile picture",
			});
		}
	});
});
