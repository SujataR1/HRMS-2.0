import fp from "fastify-plugin";
import { adminGetAllEmployeeProfile } from "../methods/adminGetAllEmployeeProfile.js";

export default fp(async function adminGetAllEmployeeProfileRoute(fastify) {
  fastify.get("/admin/employee-profiles", async (request, reply) => {
    try {
      const result = await adminGetAllEmployeeProfile();

      reply.header("x-auth-sign", "KVT9vHo0S1/AQr5mg/bKPF1vFB9ub88GMOCggNzbftboux3M6bque7YyaIfDoCsI7KDv36v67AqPpDwoehig+A==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to fetch employee profiles");
      reply.header("x-auth-sign", "Z7pbC+AJSWLun01scik6s9O6Lf54voe+betO7noyJnGy/Zfe/x9Do+KaE68Eb5gMndIsajAiQyksPbdyw531EA==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to fetch employee profiles",
      });
    }
  });
});
