import { adminGetProfile } from "../methods/adminGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function adminGetProfileRoute(fastify) {
	fastify.get("/admin/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "+0Woszu6PL0lNZ/Tl0FRmgTnSpnWGyH8sz1j1DCOkmQ7uePiNhkFZhdXsPiD+GCSeWzsQGfE/IqgP+paMrJjNw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await adminGetProfile(authHeader);

			reply.header("x-auth-sign", "J4lkTSD3yurKYxG1Z80MHREn44t1M7AmpfDDa+pt4taeg151KsQ/sPxI37QqZ47K/7293U6i9QkR7EteJG0LxA==");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to fetch admin profile"
			);
			reply.header("x-auth-sign", "0+ZmHrm5kCPwDWL169iT0EBtoXhrTQpoRS0s8BBb7Go+afMjOM+svLD8LL4A8Lt5E9F5bNrSdXf+0NszhmzM8w==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch profile",
			});
		}
	});
});
