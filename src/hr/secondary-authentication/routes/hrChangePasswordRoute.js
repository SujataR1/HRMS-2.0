import fp from "fastify-plugin";
import { hrChangePassword } from "../methods/hrChangePassword.js";
import { hrChangePasswordSchema } from "../schemas/hrChangePasswordSchema.js";

export default fp(async function hrChangePasswordRoute(fastify) {
	fastify.patch("/hr/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "1bdcfc2c93f84cddae5d3ca964b751ff ||| 23a91b4d034f0d6b68ff6c64d766364c532f4be6b17d7bbf0d2adf52488c66dccfe29d15c4ee633ec81774ef513d2f2d");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = hrChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "e20eda7986276e00db3dd46bd221da9d ||| 267fb03a343f23ffecfc9bc754a3d1a89d4ed4292c9890f287758af53a14ef809127f6464e5b219b77352125aec86ddc");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await hrChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			reply.header("x-auth-sign", "70da6df747b7ab6367589360a6931204 ||| d18f472caab7449b2a970125bbf9bf954720df13d7b8ecaf7516762975ed6b2985d4fa362e586ed38c34872ce3bd194b");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change HR password"
			);
			reply.header("x-auth-sign", "158d78e08d1eb34a16144f4d175e8509 ||| 7665e296eb96d4961200bda92beb83c35c927b0f7cf67803e1ca37b554af0e364a3d2a67aee164ece102574874ca187c");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});
