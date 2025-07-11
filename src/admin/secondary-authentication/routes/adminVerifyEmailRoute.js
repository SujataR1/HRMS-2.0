import { adminVerifyEmail } from "../methods/adminVerifyEmail.js";
import { adminVerifyEmailSchema } from "../schemas/adminVerifyEmailSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerifyEmailRoute(fastify) {
	fastify.post("/admin/verify-email", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "vjdBxeVxuxzfsvki6ewKMmCsFpXmSppvvLNUu3bhwUj9HGjEUjUIIr5lzgbBgsAYDfavKph1is0MlaZB/u7USQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminVerifyEmailSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "OJ6ge1hLYJYmlxN1U8HSVj+4TD4qt/Bt6Za3SQs9lhE9DBrX+L1Ictu974hWYnEioJZL+TQ3rwwyjxf5gbCnMQ==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminVerifyEmail(authHeader, parsed.data.otp);

			reply.header("x-auth-sign", "IzRDu5QpJYZZ5N+BJi+mKd94LljzuDBokrSOdHXoIfz5wVKmWF/jf8o9JXADHoDbYmH7YcxQwd9AwZ0Gjoj4zg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Email verification failed");
			reply.header("x-auth-sign", "Zwg27S3wHc0fdYPCl5dpfooZ4dud1Ax+Vm30vmWpGkoVty9N7zkcHvAXjLGjbQ965Hxap17eItVHma9FakB1ZA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Email verification failed",
			});
		}
	});
});
