import fp from "fastify-plugin";
import { adminGetAllEmployeeProfile } from "../methods/adminGetAllEmployeeProfile.js";

export default fp(async function adminGetAllEmployeeProfileRoute(fastify) {
  fastify.get("/admin/employee-profiles", async (request, reply) => {
    try {
      const result = await adminGetAllEmployeeProfile();

      reply.header("x-auth-sign", "rBdd62UvasR4wYMuxAUBWZwXNXcsppPsIdPaLh2pn59Yu61MMHYqHIY91it8m4Vm2HSg0p4JubYKbXSDsZDxsA==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to fetch employee profiles");
      reply.header("x-auth-sign", "E1F2guIlcW0MLDi1L8DHyqqs1plFwTOZlfrVdjcQLMh/XX686CUbMZl21Hj3izU0up/s6Uqi34Oxnw+ogpBCGA==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to fetch employee profiles",
      });
    }
  });
});
