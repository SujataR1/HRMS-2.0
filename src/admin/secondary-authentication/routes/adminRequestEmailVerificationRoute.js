import { adminRequestEmailVerification } from "../methods/adminRequestEmailVerification.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestEmailVerificationRoute(fastify) {
	fastify.post(
		"/admin/request-email-verification",
		async (request, reply) => {
			try {
				const authHeader = request.headers.authorization;

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					reply.header("x-auth-sign", "QT0ezK8sqn7U6+aFooGsg4zymtyEAYVazPmbptdNZOVvbrB09PfWbfJpFovQxIlR+BzMdGr3uX9icDmO7XsUoQ==");
					return reply.code(400).send({
						status: "error",
						message: "Authorization header missing or invalid",
					});
				}

				const result = await adminRequestEmailVerification(authHeader);

				reply.header("x-auth-sign", "2IW+7oynCbNRb4MIXS7w2JYsohjiuzadXh33mApC3X5FWsp6K9u7sv25/WJfNx/ZjXWJwlkU3SzDe5Cf/QUHmw==");
				return reply.code(200).send({
					status: "success",
					message: result.message,
				});
			} catch (error) {
				request.log.error(
					{ err: error },
					"❌ Failed to send email verification OTP"
				);
				reply.header("x-auth-sign", "NAEXK8DsvPauYc1xNehRUKm/Oo+5EJmLEYq6DfvRxYv3TvQI6wOL4fgTbfHrMro5Axx/cmljqvbJdTDF4MvI5Q==");
				return reply.code(400).send({
					status: "error",
					message:
						error.message ||
						"Failed to send email verification OTP",
				});
			}
		}
	);
});
