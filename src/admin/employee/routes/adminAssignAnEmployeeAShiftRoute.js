import fp from "fastify-plugin";
import { adminAssignAnEmployeeAShift } from "../methods/adminAssignAnEmployeeAShift.js";
import { adminAssignAnEmployeeAShiftSchema } from "../schemas/adminAssignAnEmployeeAShiftSchema.js";

export default fp(async function adminAssignAnEmployeeAShiftRoute(fastify) {
  fastify.post("/admin/assign-shift", async (request, reply) => {
    try {
      const parsed = adminAssignAnEmployeeAShiftSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "paDUBVEtzcr6n+m0+xlt7iU+upO2u8tzwN7AkPuQb2sluS4AgX+DTCTIAoU7mr27ZXrH2qjkREDzMKZ1AoYLLQ==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminAssignAnEmployeeAShift(parsed.data);

      reply.header("x-auth-sign", "QOahYfuhPTUKGq43jXJobPRh1zQUcIdQsvzjH1Mpk/9AgBEhCF8QbG+3ANH22Z2y3tVJwQ0RL2YGDDu2YWWt0Q==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign shift");
      reply.header("x-auth-sign", "MhM4YYliljjEIWqVxtY8+P9LcWa9TXe91WLmvu6XDNmNIkXiw33ujQVwHnm7SCFu/NpBfBEL8tt3cZZGQB11cw==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to assign shift",
      });
    }
  });
});
