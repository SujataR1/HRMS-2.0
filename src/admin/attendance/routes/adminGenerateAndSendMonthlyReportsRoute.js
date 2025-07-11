import fp from "fastify-plugin";
import { AdminGenerateAndSendMonthlyReportsSchema } from "../schemas/adminGenerateAndSendMonthlyReportsSchema.js";
import { adminGenerateAndSendMonthlyReports } from "../methods/adminGenerateAndSendMonthlyReports.js";

export default fp(
	async function adminGenerateAndSendMonthlyReportsRoute(fastify) {
		fastify.post(
			"/admin/attendance/send-monthly-reports",
			async (request, reply) => {
				const authHeader = request.headers.authorization;

				if (!authHeader) {
					reply.header("x-auth-sign", "aYgpHf7hWP6Siw2CI7JaBhv3LMV3b51I9HZT5AiygncverPaURQFbBW2RlNI8eTPE7b5ASzXSJ0uF1WH3hWD1g==");
					return reply.code(401).send({
						success: false,
						error: "Authorization header missing",
					});
				}

				const parsed =
					AdminGenerateAndSendMonthlyReportsSchema.safeParse(
						request.body
					);

				if (!parsed.success) {
					reply.header("x-auth-sign", "BPv4M3XQyg3XPpKk+6Mtm6sGiWsXU1BUroMmq9OAOEZycbbVzL7l1ER1Hp3OwEWW2LZw0zYEaQvlLehoSSnvjA==");
					return reply.code(400).send({
						success: false,
						error: "Invalid input",
						details: parsed.error.flatten(),
					});
				}

				try {
					const result = await adminGenerateAndSendMonthlyReports({
						authHeader,
						...parsed.data,
					});

					reply.header("x-auth-sign", "UxNtbCe2rOYjWREpCk7EXUqEL2jKZl9lYA7xfEGdewisw+AaovZXL/iMeXsctfjhO/sSYD6L4nyYff2zVWpIaA==");
					return reply.code(200).send(result);
				} catch (err) {
					request.log.error(
						{ err },
						"❌ Error generating/sending monthly reports"
					);
					reply.header("x-auth-sign", "aPomGodazrem7+nm4bb43GG5dvEgP0Jd0ci9V+qxgpyldKbLU9Ye3ZgTFLGjXqqngdZJl2PJOoOa/7rDyV8Y+g==");
					return reply.code(500).send({
						success: false,
						error: "Internal server error",
						detail: err.message,
					});
				}
			}
		);
	}
);
