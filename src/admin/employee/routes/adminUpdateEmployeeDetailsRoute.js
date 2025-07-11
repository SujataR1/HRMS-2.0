import fp from "fastify-plugin";
import { adminUpdateEmployeeDetails } from "../methods/adminUpdateEmployeeDetails.js";
import { adminUpdateEmployeeDetailsSchema } from "../schemas/adminUpdateEmployeeDetailsSchema.js";

export default fp(async function adminUpdateEmployeeDetailsRoute(fastify) {
  fastify.put("/admin/update-employee-details", async (request, reply) => {
    try {
      const parsed = adminUpdateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "3s3+NFHPHXTAGfMWOZMLrGL0LPbPmmtlEwOXtvpX3bcn0uV41AdAkpNQbRR20BX0gi/Jf57yjReS9NsQBr/bNQ==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "+Jxqw4UIZMIKiV/cG5Vc4eCj8PULPH8S8LLex8Zq72xIVMfrtjSnpJMxpzDLntaFufWoXXKV75J1OyZesdW4ZQ==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee details");
      reply.header("x-auth-sign", "Zj1wEZK9WwHym3cRa6pHwiFcVdhDnuf7pCqXzwPy/7WUzlHoY+pBuy+nKoJK6vUM1j7Bxd89jfCoXbCLJqqS/g==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee details",
      });
    }
  });
});
