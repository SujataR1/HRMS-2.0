import fp from "fastify-plugin";
import { hrGetEmployeeLeaveRegister } from "../methods/hrGetEmployeeLeaveRegister.js";
import { hrGetEmployeeLeaveRegisterSchema } from "../schemas/hrGetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrGetEmployeeLeaveRegisterRoute(fastify) {
  fastify.get("/hr/get-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const query = hrGetEmployeeLeaveRegisterSchema.safeParse(request.query);

      if (!query.success) {
        reply.header("x-auth-sign", "OFMkuHsrZ6h2L2Fpn7VyLpZ/S2JxGBAbk+Wdi9FUsrvoO+3kN8qefAPvN65RIO3VuA85J1zGculGbwIsv4uPiA==");
        return reply.code(400).send({
          status: "error",
          issues: query.error.issues,
        });
      }

      const result = await hrGetEmployeeLeaveRegister(authHeader, query.data.employeeId);

      reply.header("x-auth-sign", "Ybio2tvZpg1SGL7fIwgqhNSGk9pUwxEAUkqm5OFCpfIeCR1JkQ/q0FConSWtvV6aOCQi0lwPG0/fw9lmgUdtUg==");
      return reply.code(200).send({
        status: "success",
        data: result.data,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to fetch leave register");
      reply.header("x-auth-sign", "1UXRH4fC5AcuNYUsvQuWIXLnASvnDxRndOZrx3Ar+Nm8/EHfoxNSZhU/8+ydsaP15oGW6wln8Yuc64rBFIO2vQ==");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
