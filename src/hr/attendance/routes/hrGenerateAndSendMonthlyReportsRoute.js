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
                    reply.header("x-auth-sign", "6c44a5707bd0b62b878a3c1143736d5b ||| a6a1ca4245187a670af9506d74fc77306e6382a499b32743c0d9594b8ee863c8b44ab2215e085ba12c76a91ecbdf0125");
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
                    reply.header("x-auth-sign", "e84a6618d2af32ebe0c2fac68dbc1247 ||| de4071e25c8b83734ed02a2512f81d6c5b9c79d6c50868109ec3d953223c4d1de1db576d48eab19e238859f4d75a4a69");
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

                    reply.header("x-auth-sign", "c0e4bf7b2c1bcc9d0406d5a87ea1ee0a ||| e3bbd0648bf53d867e42e6a3f9d4b84dccdc6510d11fa08f04b20b3ba42d7e4b80ad45024e4306080745b1d948b155aa");
                    return reply.code(200).send(result);
                } catch (err) {
                    request.log.error(
                        { err },
                        "❌ Error generating/sending monthly reports"
                    );
                    reply.header("x-auth-sign", "20a1e9f4ac20ec0cb1a42fd20bca24dc ||| a21855121043dd4ed0742571914d567386e4cfbcd4cb1f307f25834fc94cd086cdf2c3d91e7d4b6cf7601828d7ef98bb");
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
