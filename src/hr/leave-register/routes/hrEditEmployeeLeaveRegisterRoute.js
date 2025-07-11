import fp from "fastify-plugin";
import { hrEditEmployeeLeaveRegister } from "../methods/hrEditEmployeeLeaveRegister.js";
import { hrEditEmployeeLeaveRegisterSchema } from "../schemas/hrEditEmployeeLeaveRegisterSchema.js";

export default fp(async function hrEditEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/edit-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;

      const parsed = hrEditEmployeeLeaveRegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "83774d85f0c01a683f4e733d19e11abf ||| 785cc09b3118229f09588592a6d92e91ccfc0691ba4ece5fa109f378dccd3921ef16693e05a3c628bbf398233aee4015");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrEditEmployeeLeaveRegister(authHeader, parsed.data);

      reply.header("x-auth-sign", "132ef21467b9cf518a1e33a4e6e5a60d ||| 874fd8aa6a96cf3034da05460663bc9a2defc6af88a76426e27f81f6d956e837fe76fa0a48cb07cd4b2a2e1d9768c159");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to edit leave register");
      reply.header("x-auth-sign", "b23e4bdb654dbf3ad0c12f5762068141 ||| 89ec92e56362d6c6fbed7c7eae8558c2cc01fd9dce608c5a11319d66752255a14c3e5db03c432e2b70b3af8677fcaf01");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
