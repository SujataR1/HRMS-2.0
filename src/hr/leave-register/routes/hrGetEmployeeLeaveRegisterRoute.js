import fp from "fastify-plugin";
import { hrGetEmployeeLeaveRegister } from "../methods/hrGetEmployeeLeaveRegister.js";
import { hrGetEmployeeLeaveRegisterSchema } from "../schemas/hrGetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrGetEmployeeLeaveRegisterRoute(fastify) {
  fastify.get("/hr/get-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const query = hrGetEmployeeLeaveRegisterSchema.safeParse(request.query);

      if (!query.success) {
        reply.header("x-auth-sign", "183e58d5e9c3bd64c51e2e355fb5c022 ||| f797db79ee5956eb998e5e417d974f21be9bca938f0b77c5baff1a070d2787386bd860f33883d483e2f1f5164f281281");
        return reply.code(400).send({
          status: "error",
          issues: query.error.issues,
        });
      }

      const result = await hrGetEmployeeLeaveRegister(authHeader, query.data.employeeId);

      reply.header("x-auth-sign", "6b1b3ca3ea7bb368c4dc116caef16d2c ||| 89c4263aef9ee4f67fff488690a776215b545d40546ec81c21819a59626db9792fb95c25b72c571b14a83490befa0d37");
      return reply.code(200).send({
        status: "success",
        data: result.data,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to fetch leave register");
      reply.header("x-auth-sign", "c4faa19d08f8966cc5f21ea964f10051 ||| 04b38d8ebed423eecc960aee881d9b131475d49ac1080ad9b87829d3f3c02a3b5078c2c89445b2d780399b383efbec5c");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
