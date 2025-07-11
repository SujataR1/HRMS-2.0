import fp from "fastify-plugin";
import { adminGetEmployeeDetails } from "../methods/adminGetEmployeeDetails.js";

export default fp(async function adminGetEmployeeDetailsRoute(fastify) {
  fastify.get("/admin/employee-details/:employeeId", async (request, reply) => {
    try {
      const { employeeId } = request.params;

      if (!employeeId) {
        reply.header("x-auth-sign", "v4Y372+YTERQAYtZJpB2ve+N0hNPabDd9jpSfDdyjmhgQCwVbM3BzJ+yMBeQ76T/IxzwBU39ZqOsic9LhsJGgA==");
        return reply.code(400).send({
          status: "error",
          message: "Employee ID is required",
        });
      }

      const result = await adminGetEmployeeDetails(employeeId);

      reply.header("x-auth-sign", "Mjs8kd+Sin7qbFWcPLyY8ob4EZ44Ai0Qm3V7/Ak5mXKMrAvm8S0NWmuZupQzx2gs1CAhq6UJJhhianbv+lc4fg==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get employee details");
      reply.header("x-auth-sign", "pcUBQyPAEgvIeTrOtC3QbOESzip6Oy+8PfHOIbGQGWsLbc2MYSi2yVMeEFnaIMsOnM5qCZC7NjSR3TW0cPL3SQ==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get employee details",
      });
    }
  });
});
