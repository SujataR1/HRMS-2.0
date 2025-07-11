import fp from "fastify-plugin";
import { adminAssignAnEmployeeAShift } from "../methods/adminAssignAnEmployeeAShift.js";
import { adminAssignAnEmployeeAShiftSchema } from "../schemas/adminAssignAnEmployeeAShiftSchema.js";

export default fp(async function adminAssignAnEmployeeAShiftRoute(fastify) {
  fastify.post("/admin/assign-shift", async (request, reply) => {
    try {
      const parsed = adminAssignAnEmployeeAShiftSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "e12e1362327b5e903e5b681d7fc7f9b6 ||| a72c247d0dc5ea7b3a665cc3b180688701d4a68e4439dcafb790ee2c0f8bfa2ca74c335fb2b6517be02f2cbb38c66c93");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminAssignAnEmployeeAShift(parsed.data);

      reply.header("x-auth-sign", "15f82027b71a721b1d0ee9b634535c6d ||| f38ca9a4cc0869e5ccc24b0ce06f76aeb3573b56665710d7d157bd4fe8855bd8bfff4683c9a68ca630d144c8bd385c4f");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign shift");
      reply.header("x-auth-sign", "c19d0383123c3a77f4655b78e20327f6 ||| fb5fab204fdaf6fff5800acafcc49258ece5ad1981b0ed3932eb0aa02375e70a9026d29d5870357e74a6e005eac91b8e");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to assign shift",
      });
    }
  });
});
