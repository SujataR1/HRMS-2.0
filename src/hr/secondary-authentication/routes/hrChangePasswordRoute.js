import fp from "fastify-plugin";
import { hrChangePassword } from "../methods/hrChangePassword.js";
import { hrChangePasswordSchema } from "../schemas/hrChangePasswordSchema.js";

export default fp(async function hrChangePasswordRoute(fastify) {
	fastify.patch("/hr/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "de4c8f384e76f95b7741fa2321f68561 ||| 6c174d3a1bc5e6c07b44e40480ac1071ef6ab0d390da33c19ab3ea0b2ccb127169d46d97c3ede8bb0fe82ff225c6eb23");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = hrChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "01e28a1e1da9fd3886f90567ad21b4fe ||| a14904f257cebcb0c969affe0df4b0ce669beb9bafe07f710f93249b7ec959fd32be1ab4ee9efad550c69e2a65415adb");
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

			reply.header("x-auth-sign", "fb2eff1e48113f6cdd58203be309b55b ||| ad5d3501a6f94335676e92bae8c0d34ca145996c2581db6bb7114f082bfc71ac8b1f5f428db79125a9d666601cecb3ea");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change HR password"
			);
			reply.header("x-auth-sign", "cfd8c1429129f5c5bf05d6af41d768d7 ||| 0e150a9ccd72d08ce9556fbfef4e4c6a600c6283c4734e9baafdcfe24f56b4edfe3095a6c112f736baaa1b3e7f0aa5a9");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});
