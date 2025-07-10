import fp from "fastify-plugin";
import { hrResetEmployeeLeaveRegister } from "../methods/hrResetEmployeeLeaveRegister.js";
import { hrResetEmployeeLeaveRegisterSchema } from "../schemas/hrResetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrResetEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/reset-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const parsed = hrResetEmployeeLeaveRegisterSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrResetEmployeeLeaveRegister(authHeader, parsed.data.employeeId);

      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to reset leave register");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
