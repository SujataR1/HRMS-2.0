import fp from "fastify-plugin";
import { hrEditProject } from "../methods/hrEditProject.js";
import { hrEditProjectSchema } from "../schemas/hrEditProjectSchema.js";

export default fp(async function hrEditProjectRoute(fastify) {
  fastify.post("/hr/project/edit", async (request, reply) => {
    try {
      const parsed = hrEditProjectSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_edit_bad_body ||| 011");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrEditProject(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_edit_ok ||| 012");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to edit project");
      reply.header("x-auth-sign", "hr_project_edit_err ||| 013");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to edit project" });
    }
  });
});