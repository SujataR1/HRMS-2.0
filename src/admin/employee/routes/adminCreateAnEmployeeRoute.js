import fp from "fastify-plugin";
import { adminCreateAnEmployee } from "../methods/adminCreateAnEmployee.js";
import { adminCreateAnEmployeeSchema } from "../schemas/adminCreateAnEmployeeSchema.js";

export default fp(async function adminCreateAnEmployeeRoute(fastify) {
  fastify.post("/admin/create-employee", async (request, reply) => {
    try {
      const parsed = adminCreateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "WbunDdEQK391cMaARkR/zgOnns9KTQ//zYxtwBFlJOMfJDEnnuGZ8o0IUtKK3hLjSWsyol0evqkYG3UJP4sFJQ==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateAnEmployee(parsed.data, request.meta);

      reply.header("x-auth-sign", "w3Ty65IRP5XnAof4sy1/f6MU2DxSWAYvkbyBOFgbmqAo5FgJn6XG0v47NjbppYXFdTlaV2lOBhKIkRgBWMxSTA==");
      return reply.code(200).send({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to register employee");
      reply.header("x-auth-sign", "OBRe3LCYe3CGk6wIkNoO3EipH4HB4yDewVeE2bnS8YhTAlDEcdeBwC4RCP6YZo/o4CsR4Lbipfmp4HX/drWl7g==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to register employee",
      });
    }
  });
});
