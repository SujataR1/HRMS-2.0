import fp from "fastify-plugin";
import { adminAssignAnEmployeeAShift } from "../methods/adminAssignAnEmployeeAShift.js";
import { adminAssignAnEmployeeAShiftSchema } from "../schemas/adminAssignAnEmployeeAShiftSchema.js";

export default fp(async function adminAssignAnEmployeeAShiftRoute(fastify) {
  fastify.post("/admin/assign-shift", async (request, reply) => {
    try {
      const parsed = adminAssignAnEmployeeAShiftSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminAssignAnEmployeeAShift(parsed.data);

      reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign shift");
      reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to assign shift",
      });
    }
  });
});
