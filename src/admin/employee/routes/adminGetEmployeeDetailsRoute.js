import fp from "fastify-plugin";
import { adminGetEmployeeDetails } from "../methods/adminGetEmployeeDetails.js";

export default fp(async function adminGetEmployeeDetailsRoute(fastify) {
  fastify.get("/admin/employee-details/:employeeId", async (request, reply) => {
    try {
      const { employeeId } = request.params;

      if (!employeeId) {
        reply.header("x-auth-sign", "9Bn7zalPNuZKbt+qBTBJXG7HRZ+XLafs/NWH3t3p41GH92rndUU6GusdQrLPmniy98MlMYpKffacjEmalOAkog==");
        return reply.code(400).send({
          status: "error",
          message: "Employee ID is required",
        });
      }

      const result = await adminGetEmployeeDetails(employeeId);

      reply.header("x-auth-sign", "yX8lMklq1scifOzAPO2QZG6NHmU1JhA1meB+4b4kmtt/pvfUmzZ8o0dfCrpmZycRawNgjYjO5X/3XTdYjTm/Kw==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get employee details");
      reply.header("x-auth-sign", "yaFT9Kz97anbcwuWpMt5KqysYaI/6O2+rMaAJEo5hEuoi+1vSzeyThluQ/RTHaB4XZSW1dJs5yDe9tGGGSIMvw==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get employee details",
      });
    }
  });
});
