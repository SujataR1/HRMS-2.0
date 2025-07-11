import fp from "fastify-plugin";
import { hrCreateEmployeeLeaveRegister } from "../methods/hrCreateEmployeeLeaveRegister.js";
import { hrCreateEmployeeLeaveRegisterSchema } from "../schemas/hrCreateEmployeeLeaveRegisterSchema.js";

export default fp(async function hrCreateEmployeeLeaveRegisterRoute(fastify) {
	fastify.post("/hr/create-leave-register", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrCreateEmployeeLeaveRegisterSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.header("x-auth-sign", "+T3OFxEFSmVCo3VxG9KxVQNL5SkKBLoffayt4XWTM2yonRzXI7vCGEjMa/9tsa8YeH8Ain/rGlszvNZz5FSRrw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrCreateEmployeeLeaveRegister(authHeader, parsed.data);

			reply.header("x-auth-sign", "dTNiYlpyONV5L4rzltjw9shcNCF5yTGrgI16DRc7GFJwbfmg4R5EhXvIzmu0wBrqHw52LDaYfmNgDv1aKR/ifA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				data: result.register,
			});
		} catch (err) {
			request.log.error({ err }, "🔥 Failed to create leave register");
			reply.header("x-auth-sign", "OoEkd1VlUnLvgz0bXQLAlRE5XRRk7G5VeCLu2x3a5NUD3hg/MSSzvuw82dt90ALx6sE/AVQh7zYlPEvtPidGQw==");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unexpected error occurred",
			});
		}
	});
});
