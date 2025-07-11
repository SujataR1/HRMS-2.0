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
                    reply.header("x-auth-sign", "f9abdb95887ce17237708eda841bd7cc ||| 51fc433be4e2094a953668479df65c93c0fdc3236bcf08582147aaec0a47d6fa5ce849c045ee80e002c520c19e2b75dc");
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
                    reply.header("x-auth-sign", "98bc762014579480dbfb7c409ba27813 ||| 7361bc8f1992b74f0c592dceaa5a46d307fa34dbfdcf63339ec1c093e9490b0416f0e6d416231b89644d2b7db21ea7e5");
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

                    reply.header("x-auth-sign", "2dcd7c4823a31a9b954b5a4c0023aafd ||| 042b5cc9131210942ecf9bd283197a0b7d3293e596c459a5ecf9927a7dccd399c37704e52c743a884672dfa2dc31c1da");
                    return reply.code(200).send(result);
                } catch (err) {
                    request.log.error(
                        { err },
                        "❌ Error generating/sending monthly reports"
                    );
                    reply.header("x-auth-sign", "f738fdb262b42da4b16ba28190cd051c ||| f463bb4861c65baaa69054827309e4158c90c837673fd8cbc78c292f32d18b974c7ba6aaced5d30dba33d6c8dc506cd8");
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
