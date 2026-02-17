import fp from "fastify-plugin";
import { hrGetProjectById } from "../methods/hrGetProjectById.js";
import { hrGetProjectByIdSchema } from "../schemas/hrGetProjectByIdSchema.js";

export default fp(async function hrGetProjectByIdRoute(fastify) {
  fastify.post("/hr/project/get", async (request, reply) => {
    try {
      const parsed = hrGetProjectByIdSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_get_bad_body ||| 031");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetProjectById(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_get_ok ||| 032");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get project");
      reply.header("x-auth-sign", "hr_project_get_err ||| 033");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get project" });
    }
  });
});