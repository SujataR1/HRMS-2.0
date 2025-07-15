import fp from "fastify-plugin";
import { adminGetAllEmployeeProfile } from "../methods/adminGetAllEmployeeProfile.js";

export default fp(async function adminGetAllEmployeeProfileRoute(fastify) {
  fastify.get("/admin/employee-profiles", async (request, reply) => {
    try {
      const result = await adminGetAllEmployeeProfile();

      reply.header("x-auth-sign", "4fd63598ff9886f889c0defa03075705 ||| 797abf168149c65264bfbd4e698150bbc88513283c7d42f04b1fee40a09a9a59fc5dabe86ff65a87522fe363f2b7c1d1");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to fetch employee profiles");
      reply.header("x-auth-sign", "86cfc01d3581728ca0a2e887c58aab91 ||| 891ea1d2987578a6fef66aed6972acc3c2f5d1e15a45dea18d0bbb7ed86f3abd2604ce25fa21e5b4784476b6e642a490");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to fetch employee profiles",
      });
    }
  });
});
