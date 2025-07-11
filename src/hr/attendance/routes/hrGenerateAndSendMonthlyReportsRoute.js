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
                    reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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
                    reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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

                    reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
                    return reply.code(200).send(result);
                } catch (err) {
                    request.log.error(
                        { err },
                        "❌ Error generating/sending monthly reports"
                    );
                    reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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
