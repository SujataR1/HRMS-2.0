import fp from "fastify-plugin";
import { hrEditEmployeeLeaveRegister } from "../methods/hrEditEmployeeLeaveRegister.js";
import { hrEditEmployeeLeaveRegisterSchema } from "../schemas/hrEditEmployeeLeaveRegisterSchema.js";

export default fp(async function hrEditEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/edit-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;

      const parsed = hrEditEmployeeLeaveRegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "Pv5zNGDlihLvs/dFBCLYSYgU/rJYn7lyERiyqx7olwsf8Ksz/Ej5Ov1yKrh0lUxjzn3m1IFSUCmPiynQdtNJeg==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrEditEmployeeLeaveRegister(authHeader, parsed.data);

      reply.header("x-auth-sign", "jTs6mZt+Ig0v7wSt41QfONQor05ezeyzLAq+uJW553+n58imSRrWClNpvWgqg/DKUuYIvmLfd5T0/e8cUs9ywg==");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to edit leave register");
      reply.header("x-auth-sign", "KRBValVlP+M43rzn2H/m86MDhmmq1bq26peMzUkViepBWVCcDLqYVTeARNZdRc2dhDTVoFH54NfYYR9DzdMpgQ==");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
