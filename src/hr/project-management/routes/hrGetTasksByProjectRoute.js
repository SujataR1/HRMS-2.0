import fp from "fastify-plugin";
import { hrGetTasksByProject } from "../methods/hrGetTasksByProject.js";
import { hrGetTasksByProjectSchema } from "../schemas/hrGetTasksByProjectSchema.js";

export default fp(async function hrGetTasksByProjectRoute(fastify) {
  fastify.post("/hr/task/get-by-project", async (request, reply) => {
    try {
      const parsed = hrGetTasksByProjectSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_get_by_project_bad_body ||| 121");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetTasksByProject(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_get_by_project_ok ||| 122");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get tasks by project");
      reply.header("x-auth-sign", "hr_task_get_by_project_err ||| 123");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get tasks by project" });
    }
  });
});