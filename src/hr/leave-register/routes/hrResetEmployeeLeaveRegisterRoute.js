import fp from "fastify-plugin";
import { hrResetEmployeeLeaveRegister } from "../methods/hrResetEmployeeLeaveRegister.js";
import { hrResetEmployeeLeaveRegisterSchema } from "../schemas/hrResetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrResetEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/reset-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const parsed = hrResetEmployeeLeaveRegisterSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "8cf6381963a429b0914fbc509535f234 ||| 0133475dd2bb6528ae51e200947348e5460c90ea5d9d1edebc54868d95e3d260156fe1c179cb7e612e9f3a76dd1559bf");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrResetEmployeeLeaveRegister(authHeader, parsed.data.employeeId);

      reply.header("x-auth-sign", "86ef45d5b60f50f48c67c4a888a7cb6e ||| c36312bd4e02b5d358116000a6e5ff2ddd6bf6c4fc0ebb312b79d64216daaaeb5794c5061ac8c9ac36eeb076023fe30e");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to reset leave register");
      reply.header("x-auth-sign", "a9080771dc2e582ef827cff7321bbb54 ||| 0a9743ed2db6cdcaa08ecc9fdd0440e347fffe551624faa0c475bc821a100be613920c90a37dd31d825225ecb556b563");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
