import fp from "fastify-plugin";
import { hrEditEmployeeLeaveRegister } from "../methods/hrEditEmployeeLeaveRegister.js";
import { hrEditEmployeeLeaveRegisterSchema } from "../schemas/hrEditEmployeeLeaveRegisterSchema.js";

export default fp(async function hrEditEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/edit-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;

      const parsed = hrEditEmployeeLeaveRegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrEditEmployeeLeaveRegister(authHeader, parsed.data);

      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to edit leave register");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
