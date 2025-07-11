import fp from "fastify-plugin";
import { adminGetEmployeeDetails } from "../methods/adminGetEmployeeDetails.js";

export default fp(async function adminGetEmployeeDetailsRoute(fastify) {
  fastify.get("/admin/employee-details/:employeeId", async (request, reply) => {
    try {
      const { employeeId } = request.params;

      if (!employeeId) {
        reply.header("x-auth-sign", "49252fb7e858a604bebee3309f0f5a25 ||| 7d5b3d90d92797ce0d7986c0e330324fda439875e4bd95aa21b4442b957fb76a909313ac0d986f0c714ccdbacaee651f");
        return reply.code(400).send({
          status: "error",
          message: "Employee ID is required",
        });
      }

      const result = await adminGetEmployeeDetails(employeeId);

      reply.header("x-auth-sign", "d77db2eec9a89870a211bec48f266983 ||| 289f7cc4b387bd4c0956ff26dde562cb879f301a1d6420ce0c7f5e1c489a4d502e6b1d242a14e3640d5e51619e1d9b5a");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get employee details");
      reply.header("x-auth-sign", "4f5c49bd37a231252827be46a0a6b631 ||| fe8f631f749421922d8edeb915a40f19278d47ecbe482e52c70f15aa9657d9b798b6b72f15c411282db38bc078280012");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get employee details",
      });
    }
  });
});
