import fp from "fastify-plugin";
import { adminAssignAnEmployeeAShift } from "../methods/adminAssignAnEmployeeAShift.js";
import { adminAssignAnEmployeeAShiftSchema } from "../schemas/adminAssignAnEmployeeAShiftSchema.js";

export default fp(async function adminAssignAnEmployeeAShiftRoute(fastify) {
  fastify.post("/admin/assign-shift", async (request, reply) => {
    try {
      const parsed = adminAssignAnEmployeeAShiftSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "f94f7d4cffdae5bf6398491e93afd5b0 ||| d501f6240b6661c6aa5234be9346a3f2c8951ca8caf1e8676449362a02299815ed5027aed3ef5532d719e44f5366556e");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminAssignAnEmployeeAShift(parsed.data);

      reply.header("x-auth-sign", "9a5cf6c68519a2f48fe8e5e5f6c9995b ||| 82ff0d887c8ed20389917030463ac28381ae7f92d03e9e863af52e49eebe6ad88a547f667d6bb06d389c64a52867dc40");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign shift");
      reply.header("x-auth-sign", "ba7da901bd54bb657ae2d6e383e2c56f ||| 871dd364cbab39dbe2643091a4a87a38a06e71b1ba50f2d7333a2ddee11653589a3148c8b767e422a08495785ffaaeed");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to assign shift",
      });
    }
  });
});
