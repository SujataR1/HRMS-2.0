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
                    reply.header("x-auth-sign", "2++Eh07cybs0aN8m2ZDB+VrxCGjBx1GZ1Z1irKhApy6l+Njysxhmrx0dQzvJOHrkSg2tr1wEDCuLt2Yh8EwjHw==");
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
                    reply.header("x-auth-sign", "IZ6QZ5hF94yS+W9AT4//1yN2LBJLvIf1juCQ9mpkLQWLShmhyuJYcwcZZJGZTUEcV/ER1LcoXxnOqW1UycKHBg==");
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

                    reply.header("x-auth-sign", "ZBmO9WXFXKID2jM5NLVU1sMSQzaBhfaNyPXH62RNN3HeaSXDv74fwmBhbXqBHJlNvMKMN5x8LFuggwXUhE/J9A==");
                    return reply.code(200).send(result);
                } catch (err) {
                    request.log.error(
                        { err },
                        "❌ Error generating/sending monthly reports"
                    );
                    reply.header("x-auth-sign", "5oWEWb9MOJxRIwvxns/fC6sEyE+XlA6hpJ3wU7my5Z6Zc3qDGhijj+ysmuDwao370dLeiqMxz+/zkFN+qMhidg==");
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
