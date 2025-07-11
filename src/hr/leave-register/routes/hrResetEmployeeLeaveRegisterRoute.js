import fp from "fastify-plugin";
import { hrResetEmployeeLeaveRegister } from "../methods/hrResetEmployeeLeaveRegister.js";
import { hrResetEmployeeLeaveRegisterSchema } from "../schemas/hrResetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrResetEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/reset-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const parsed = hrResetEmployeeLeaveRegisterSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "TLQ0byKH3eHJlDbse5QX/u1U3WrAyTUM1W34/CXz/4VjDmYR9IbgUXNKL6+nfUyyVforob5aLz3OX06ZzTMTOQ==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrResetEmployeeLeaveRegister(authHeader, parsed.data.employeeId);

      reply.header("x-auth-sign", "8bnHJOr8GfA2ihKV6LCNhUsQyX7z/pytF/nMjDgDccqkc7dRwZEBZ4zVByrZjxR1D2fcSZVods25Ra1G42Aieg==");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to reset leave register");
      reply.header("x-auth-sign", "DZt+h7D//kwKKwAiAY2eYh3h85b7WuW/QsaM5C5BekEKRrqMArVxsn+RL5TySW5KGtknfn18DP5QY1Z9i0k7QQ==");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
