import fp from "fastify-plugin";
import { adminGetEmployeeDetails } from "../methods/adminGetEmployeeDetails.js";

export default fp(async function adminGetEmployeeDetailsRoute(fastify) {
  fastify.get("/admin/employee-details/:employeeId", async (request, reply) => {
    try {
      const { employeeId } = request.params;

      if (!employeeId) {
        return reply.code(400).send({
          status: "error",
          message: "Employee ID is required",
        });
      }

      const result = await adminGetEmployeeDetails(employeeId);

      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get employee details");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get employee details",
      });
    }
  });
});
