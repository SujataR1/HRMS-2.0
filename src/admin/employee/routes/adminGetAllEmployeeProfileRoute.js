import fp from "fastify-plugin";
import { adminGetAllEmployeeProfile } from "../methods/adminGetAllEmployeeProfile.js";

export default fp(async function adminGetAllEmployeeProfileRoute(fastify) {
  fastify.get("/admin/employee-profiles", async (request, reply) => {
    try {
      const result = await adminGetAllEmployeeProfile();

      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to fetch employee profiles");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to fetch employee profiles",
      });
    }
  });
});
