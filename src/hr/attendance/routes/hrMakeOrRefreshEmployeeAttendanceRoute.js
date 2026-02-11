import fp from "fastify-plugin";
import { hrMakeOrRefreshEmployeeAttendance } from "../methods/hrMakeOrRefreshEmployeeAttendance.js";
import { HrMakeOrRefreshEmployeeAttendanceSchema } from "../schemas/hrMakeOrRefreshEmployeeAttendanceSchema.js";

export default fp(
    async function hrMakeOrUpdateEmployeeAttendanceRoute(fastify) {
        fastify.post("/hr/attendance/generate", async (request, reply) => {
            const parsed = HrMakeOrRefreshEmployeeAttendanceSchema.safeParse(
                request.body
            );

            if (!parsed.success) {
                reply.header("x-auth-sign", "63daeef408420e48a10744500133cb97 ||| cd63587d69c21b16f6f33ca1a6f54f78e4cfdaebca198c1810e957a18a1e5eb2f957e35015381d699fd195d44fb2ebfb");
                return reply.code(400).send({
                    success: false,
                    error: "Invalid input",
                    details: parsed.error.flatten(),
                });
            }

            const authHeader = request.headers.authorization;

            try {
                const result = await hrMakeOrRefreshEmployeeAttendance({
                    authHeader,
                    ...parsed.data,
                });
                reply.header("x-auth-sign", "047ecd6d13d6f825f25fd1a01e3913be ||| 01686ab6f48f64c2c38dacd813448c03356c96884da59fb40120d0d7c5db54101f69762d03972069e785080cac951b07");
                return reply.code(200).send(result);
            } catch (err) {
                request.log.error(
                    { err },
                    "❌ Error in adminMakeOrRefreshEmployeeAttendance"
                );
                return reply
                    .code(500)
                    .send({ success: false, error: "Internal server error" });
            }
        });
    }
);
