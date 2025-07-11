import { adminChangePassword } from "../methods/adminChangePassword.js";
import { adminChangePasswordSchema } from "../schemas/adminChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminChangePasswordRoute(fastify) {
	fastify.patch("/admin/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "81d4108f53446f99969a26fc4beca858 ||| 64f518a0518a58ead7f4b59d58b088e78e43c0347596ac54555d0e5e684dbd0c14d75fdba1542e22abbf71fd9cd4683c");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "b9b5f33d9f06a43d47914b52c65a9d3e ||| 0d666504ae54d84ce7c51dfa25283f6e1ea5a1d9c063cf1656112f292ca07c8da87b8534436e4ce5d9a7213cc612a1a0");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await adminChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			reply.header("x-auth-sign", "3762ff4e7200fcb2b952ffa8b039f72b ||| 7da5186df54145ca18a2e2562ca701a047d3a13d7160901704e4f8174e46ef7f73ec3e08bb8e2313a475d255d9346409");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change admin password"
			);
			reply.header("x-auth-sign", "81923e17c9f7b843a693451d3e961993 ||| 44b96082cbfdc0196e1c375c8b9bc21e712f14ca2dfc00162b2bc5931528a18ba0b7ed550d6638805fc31a5e20ef44c6");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});
