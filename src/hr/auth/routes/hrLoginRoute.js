import fp from "fastify-plugin";
import { hrLogin } from "../methods/hrLogin.js";
import { hrLoginSchema } from "../schemas/hrLoginSchema.js";

export default fp(async function hrLoginRoute(fastify) {
	fastify.post("/hr/login", async (request, reply) => {
		try {
			const parsed = hrLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "egjeMDO1ulMheo89g69Cth5JGPdW9/8HtbzNsYghjDOx0Qw3nFraxj7oTFrhjkr/qWs/Ce0xqEtzXpWuSGHC2w==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrLogin(parsed.data);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "bKQRacY6BFfDRnZaumuZ/WwtyZhLfwmfBIT3HUgeQ3s079eO0XoB+19il/eunqDKuPNM+LynsB5q/GkxU/04FQ==");
				return reply.code(200).send({
					status: "success",
					requires2FA: true,
				});
			}

			reply
				.header("Authorization", `Bearer ${result.token}`)
				.code(200)
				.send({
					status: "success",
					authorization: `Bearer ${result.token}`
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR login failed");
			reply.header("x-auth-sign", "gH5k0gL66gUBI2p1LsWXyYMK6RnfBy2i+e3gU7BCuyJ/wnElmP2pu4ZdmdzWkIpBBsxBbj78yna1scihFr9Slg==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});
