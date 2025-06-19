import fp from "fastify-plugin";
import { adminCreateAnEmployee } from "../methods/adminCreateAnEmployee.js";
import { adminCreateAnEmployeeSchema } from "../schemas/adminCreateAnEmployeeSchema.js";

export default fp(async function adminRegisterAnEmployeeRoute(fastify) {
  fastify.post("/admin/register-employee", async (request, reply) => {
    try {
      const parsed = adminCreateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateAnEmployee(parsed.data, request.meta);

      return reply.code(200).send({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to register employee");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to register employee",
      });
    }
  });
});
