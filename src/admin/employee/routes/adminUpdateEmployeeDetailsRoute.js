import fp from "fastify-plugin";
import { adminUpdateEmployeeDetails } from "../methods/adminUpdateEmployeeDetails.js";
import { adminUpdateEmployeeDetailsSchema } from "../schemas/adminUpdateEmployeeDetailsSchema.js";

export default fp(async function adminUpdateEmployeeDetailsRoute(fastify) {
  fastify.put("/admin/update-employee-details", async (request, reply) => {
    try {
      const parsed = adminUpdateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee details");
      reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee details",
      });
    }
  });
});
