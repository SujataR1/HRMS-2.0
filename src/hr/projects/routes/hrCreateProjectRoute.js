import fp from "fastify-plugin";
import { hrCreateProject } from "../methods/hrCreateProject.js";
import { hrCreateProjectSchema } from "../schemas/hrCreateProjectSchema.js";

export default fp(async function hrCreateProjectRoute(fastify) {
  fastify.post("/hr/project/create", async (request, reply) => {
    try {
      const parsed = hrCreateProjectSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_create_bad_body ||| 001");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrCreateProject(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_create_ok ||| 002");
      return reply.code(201).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create project");
      reply.header("x-auth-sign", "hr_project_create_err ||| 003");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to create project" });
    }
  });
});