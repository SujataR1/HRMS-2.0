import { adminVerifyEmail } from "../methods/adminVerifyEmail.js";
import { adminVerifyEmailSchema } from "../schemas/adminVerifyEmailSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerifyEmailRoute(fastify) {
	fastify.post("/admin/verify-email", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "2kQE0seYw1/Zdu+wmkN6cmzhlDlAwb5QqA+2vgbjHTSo9cH9ZbgI+sAUFzhTLTbpzUyQsIgqFWTXfUm6U3eHtw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminVerifyEmailSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "1cUB2bqNGOMw3GjFAppmn/P2gEMPrNKNDKTzg7XqzAECH/BBHbQ5YURWUcGqEXoZBPdOiDQmSgW9UYRgIu65wQ==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminVerifyEmail(authHeader, parsed.data.otp);

			reply.header("x-auth-sign", "wC876Es/IEcQjlSCTWcfW4Cq3zNiyVk9yIlE2cpc74REeZFvijG78TWSg5W1EHtedsdxQaqFwKA/ZVRvD61i7w==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Email verification failed");
			reply.header("x-auth-sign", "VTr0y6b1/lGQ7igWOJbcllj3cqfi/sS1RHGgPxxHW13OI0nEaFbsrCZ/tjbF9Ky/VWZZeazsmOSS9RhwcjCb8w==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Email verification failed",
			});
		}
	});
});
