import fp from "fastify-plugin";
import { hrResetEmployeeLeaveRegister } from "../methods/hrResetEmployeeLeaveRegister.js";
import { hrResetEmployeeLeaveRegisterSchema } from "../schemas/hrResetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrResetEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/reset-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const parsed = hrResetEmployeeLeaveRegisterSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "O7PFzGyqP6QaYhIrVRXEu/eO9j/ZMHQ2/q0DkfjOEZU1Weyip6lEQ+KsjLPJmRYsyuyqls3IssH+nxcTMDYAaw==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrResetEmployeeLeaveRegister(authHeader, parsed.data.employeeId);

      reply.header("x-auth-sign", "aqpBdp/LYtrCPx8QsOxqhQXYnu4IdVP6+EWi7bY9pTQnjDIpT0zh11xy+29Dg3Tws8K9o8kMUdEs7s4sI9HPUw==");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to reset leave register");
      reply.header("x-auth-sign", "bqyLrgPYnL4vNoOFcmCRUBHHZ+930wnJyhQqPsQ4BHwf9Ct1mOSnO7y/EWTTtfWlhyn/sFOWLAM2CRTrYZN2Xw==");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
