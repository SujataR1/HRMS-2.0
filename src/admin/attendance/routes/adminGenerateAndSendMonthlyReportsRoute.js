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
					reply.header("x-auth-sign", "GoOAzW7elZm5kcLZPG6CL4v/VTlYmtZOcVkXqY3srvWbQhGa6kzX5sErgj7EhDJMLH7nT6OUW6x9Eqdl6Rj7zA==");
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
					reply.header("x-auth-sign", "aLafKOkCktbnUSFO4tr0we/B8Nx+nRnE0ZzrDZ5FeRxQ53EjqKbeXM0NnH1pRU37GHynDsgn4HGjVL9XyZxkZg==");
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

					reply.header("x-auth-sign", "tvZgmiWApYez7Zja3wfCv9/tINTtQO/OsVcfKHuybiRoBfqWrGHmiG2syl22o2Md2fFKgd/dvgfeSwXxuPzHLw==");
					return reply.code(200).send(result);
				} catch (err) {
					request.log.error(
						{ err },
						"❌ Error generating/sending monthly reports"
					);
					reply.header("x-auth-sign", "vXWLbG1tuwHiZMxGiiV52k6VPq/2UDU53tj5uq9NyQujFOMsmfhtwkNYv0ilv9XcDK+LumWSgHpXKHRLM8KBOw==");
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
