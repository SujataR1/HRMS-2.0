import fp from "fastify-plugin";
import { adminGetEmployeeDetails } from "../methods/adminGetEmployeeDetails.js";

export default fp(async function adminGetEmployeeDetailsRoute(fastify) {
  fastify.get("/admin/employee-details/:employeeId", async (request, reply) => {
    try {
      const { employeeId } = request.params;

      if (!employeeId) {
        reply.header("x-auth-sign", "2f8f57bdbb396d43fa427f411e3247c1 ||| a58efbe07dbbfcbadef70d86a8930201ca8d7061952dd727f155aa92e003e5de2548e2d3daf73fd6e53a09d94e478c0e");
        return reply.code(400).send({
          status: "error",
          message: "Employee ID is required",
        });
      }

      const result = await adminGetEmployeeDetails(employeeId);

      reply.header("x-auth-sign", "3c8e15507b642a7c2255f5594a8948fa ||| 796e2e20f78d556de25f09b27be1f6b22cf08e60b6a444ebe91035b5b01cff44c30ea0ceda30df2f01d7a6eb19f4a45f");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get employee details");
      reply.header("x-auth-sign", "350bee3048c7ab5579573cdea403420f ||| 48dbbfc59870b911316a25f1a61d60f61db24c4a77c7b487f225b281667916ac3549ef9225a437b998b5e91326be4d00");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get employee details",
      });
    }
  });
});
