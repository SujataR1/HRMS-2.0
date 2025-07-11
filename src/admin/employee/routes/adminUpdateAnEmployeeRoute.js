import fp from "fastify-plugin";
import { adminUpdateAnEmployee } from "../methods/adminUpdateAnEmployee.js";
import { adminUpdateAnEmployeeSchema } from "../schemas/adminUpdateAnEmployeeSchema.js";

export default fp(async function adminUpdateAnEmployeeRoute(fastify) {
  fastify.put("/admin/update-employee", async (request, reply) => {
    try {
      const parsed = adminUpdateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "9b91u96FgkGAYyU6GGQrUuJ+fGeXwAyLXlPKDsbs+nbQOfUQ3MCxH///CUmuxvroewwD1I3bI2vU6CAYFglCLw==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateAnEmployee(parsed.data);

      reply.header("x-auth-sign", "rFvGztyfrexDwu0iO/DC1A8s2dY6/6SjokjUCTFpB/Ahfuwblfrmrcj0gEYH+LpTMi6ISxLbX8B0tV5XZqqhVQ==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee");
      reply.header("x-auth-sign", "E4jOJmhUASz82JARUhP1D45JCxSPFo/WRN8AZusL0KqWHbZH7k1om4xv4cBDbbTkHL/awOeO2qc1D8avL5lxmw==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee",
      });
    }
  });
});
