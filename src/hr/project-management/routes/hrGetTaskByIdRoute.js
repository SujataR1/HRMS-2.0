import fp from "fastify-plugin";
import { hrGetTaskById } from "../methods/hrGetTaskById.js";
import { hrGetTaskByIdSchema } from "../schemas/hrGetTaskByIdSchema.js";

export default fp(async function hrGetTaskByIdRoute(fastify) {
  fastify.post("/hr/task/get", async (request, reply) => {
    try {
      const parsed = hrGetTaskByIdSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_get_bad_body ||| 021");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetTaskById(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_get_ok ||| 022");
      return reply.code(200).send(result);

    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get task");

      reply.header("x-auth-sign", "hr_task_get_err ||| 023");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get task",
      });
    }
  });
});