import fp from "fastify-plugin";
import { hrGetEmployeeLeaveRegister } from "../methods/hrGetEmployeeLeaveRegister.js";
import { hrGetEmployeeLeaveRegisterSchema } from "../schemas/hrGetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrGetEmployeeLeaveRegisterRoute(fastify) {
  fastify.get("/hr/get-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const query = hrGetEmployeeLeaveRegisterSchema.safeParse(request.query);

      if (!query.success) {
        reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
        return reply.code(400).send({
          status: "error",
          issues: query.error.issues,
        });
      }

      const result = await hrGetEmployeeLeaveRegister(authHeader, query.data.employeeId);

      reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
      return reply.code(200).send({
        status: "success",
        data: result.data,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to fetch leave register");
      reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
