import fp from "fastify-plugin";
import { hrLogin } from "../methods/hrLogin.js";
import { hrLoginSchema } from "../schemas/hrLoginSchema.js";

export default fp(async function hrLoginRoute(fastify) {
	fastify.post("/hr/login", async (request, reply) => {
		try {
			const parsed = hrLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "dee04b66719d5051bf9edc5c1aeb1897 ||| 4b5e11a123033921462c60b7b6ffe8127a84f04d7f81d32951b1e90e23123fe44242658b35d1f9ed9d663de2855ae8f1");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrLogin(parsed.data);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "bffab13dc0dc8679b7c9a7de58620787 ||| 66859b5918495ec633b9db8d4083017e237860f12c49fbec59aafe852914770ce5d7269f8fc280f092cb0cdeec2525fc");
				return reply.code(200).send({
					status: "success",
					requires2FA: true,
				});
			}

			reply
				.header("Authorization", `Bearer ${result.token}`)
				.header("x-auth-sign","e1433b1aaea03f2eefedb21f15d448b3 ||| 7f6f4e73b91e97ee4349cb83376dcc7e9d94231ba991f93ea8643708ef5c3605815d61e7870c2dc1f9e82e0c7deae74c")
				.code(200)
				.send({
					status: "success",
					authorization: `Bearer ${result.token}`
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR login failed");
			reply.header("x-auth-sign", "09e00b1c83b16ab0822f086803dca1c3 ||| 2f42f548d47b3faf524233f8f612493035aac6b260efae9b3cc627fae0e7a7be31023a831373f6fac37ba907f0108383");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});
