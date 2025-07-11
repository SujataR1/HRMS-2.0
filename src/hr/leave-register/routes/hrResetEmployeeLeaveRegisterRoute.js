import fp from "fastify-plugin";
import { hrResetEmployeeLeaveRegister } from "../methods/hrResetEmployeeLeaveRegister.js";
import { hrResetEmployeeLeaveRegisterSchema } from "../schemas/hrResetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrResetEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/reset-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const parsed = hrResetEmployeeLeaveRegisterSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "b4bfd3e2078d03f08744122a1236faa2 ||| f0e113a474f0d825e8c2f0814e82b2fffd683ec0cea207621615f118ca06aa04a821321e20cc62ed3678cf577474cc68");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrResetEmployeeLeaveRegister(authHeader, parsed.data.employeeId);

      reply.header("x-auth-sign", "2ebf8d8fcff29209b46557ae408f1130 ||| 6c81c2fd21c2c5ea327317c5f71c6d8280a182b7b5cd641dbb326028c25b5529f0a0988c596fd4e05f883f48ce81f319");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to reset leave register");
      reply.header("x-auth-sign", "b3c55d53d5e9a51e76d566edfe042144 ||| c32ae70f345738311a8af53915582bed2923379ea5bb2647c0726ee67e05f82c61d0a108e0cb7cbe1e7eca9eb2fc9f47");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
