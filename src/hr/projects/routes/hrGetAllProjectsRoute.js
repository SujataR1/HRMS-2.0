import fp from "fastify-plugin";
import { hrGetAllProjects } from "../methods/hrGetAllProjects.js";
import { hrGetAllProjectsSchema } from "../schemas/hrGetAllProjectsSchema.js";

export default fp(async function hrGetAllProjectsRoute(fastify) {
  fastify.post("/hr/project/get-all", async (request, reply) => {
    try {
      const parsed = hrGetAllProjectsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_get_all_bad_body ||| 021");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetAllProjects(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_get_all_ok ||| 022");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get all projects");
      reply.header("x-auth-sign", "hr_project_get_all_err ||| 023");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get all projects" });
    }
  });
});