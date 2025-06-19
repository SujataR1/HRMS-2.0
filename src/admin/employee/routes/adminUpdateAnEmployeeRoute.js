import fp from "fastify-plugin";
import { adminUpdateAnEmployee } from "../methods/adminUpdateAnEmployee.js";
import { adminUpdateAnEmployeeSchema } from "../schemas/adminUpdateAnEmployeeSchema.js";

export default fp(async function adminUpdateAnEmployeeRoute(fastify) {
  fastify.put("/admin/update-employee", async (request, reply) => {
    try {
      const parsed = adminUpdateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateAnEmployee(parsed.data);

      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee",
      });
    }
  });
});
