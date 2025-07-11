import fp from "fastify-plugin";
import { HrGenerateAndSendMonthlyReportsSchema } from "../schemas/hrGenerateAndSendMonthlyReportsSchema.js";
import { hrGenerateAndSendMonthlyReports } from "../methods/hrGenerateAndSendMonthlyReports.js";

export default fp(
    async function hrGenerateAndSendMonthlyReportsRoute(fastify) {
        fastify.post(
            "/hr/attendance/send-monthly-reports",
            async (request, reply) => {
                const authHeader = request.headers.authorization;

                if (!authHeader) {
                    reply.header("x-auth-sign", "+mNiCYGuFswLbMgt+RJZWTtvjXkVSp6zrC0rw6FKtwPo2fpLeRE05lJtzz1+cWvZ1rsqFwaJRAciguJHP92TzA==");
                    return reply.code(401).send({
                        success: false,
                        error: "Authorization header missing",
                    });
                }

                const parsed =
                    HrGenerateAndSendMonthlyReportsSchema.safeParse(
                        request.body
                    );

                if (!parsed.success) {
                    reply.header("x-auth-sign", "E5vgSSRCm62BU6Y7BeLVeEW9fY5gEqd604EyIkLNj8iTGPa0fuPPlvGwY/zjw0vFvnKgD9wqVMoj+2cZWZNBkA==");
                    return reply.code(400).send({
                        success: false,
                        error: "Invalid input",
                        details: parsed.error.flatten(),
                    });
                }

                try {
                    const result = await hrGenerateAndSendMonthlyReports({
                        authHeader,
                        ...parsed.data,
                    });

                    reply.header("x-auth-sign", "Yu3ftp53+WA8Iv3OavmStoK6d5CKvhNEV+jjEwmxpCEGhbwszhQ+MKYqWXoDHBTWvd4esoCKmFilAJV4j7jzPg==");
                    return reply.code(200).send(result);
                } catch (err) {
                    request.log.error(
                        { err },
                        "❌ Error generating/sending monthly reports"
                    );
                    reply.header("x-auth-sign", "2/tGQP7EImKdACyy9U0Lotbm94qMbfqEn5+rKda23R1LruaXXc4ePMq/SpbKAQUvXDw+uaXD0uO6pTQD4ZkB+g==");
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
