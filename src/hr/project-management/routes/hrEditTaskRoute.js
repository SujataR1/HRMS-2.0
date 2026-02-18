import fp from "fastify-plugin";
import { hrEditTask } from "../methods/hrEditTask.js";
import { hrEditTaskSchema } from "../schemas/hrEditTaskSchema.js";

export default fp(async function hrEditTaskRoute(fastify) {
  fastify.post("/hr/task/edit", async (request, reply) => {
    try {
      const parsed = hrEditTaskSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_edit_bad_body ||| 011");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrEditTask(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_edit_ok ||| 012");
      return reply.code(200).send(result);

    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to edit task");

      reply.header("x-auth-sign", "hr_task_edit_err ||| 013");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to edit task",
      });
    }
  });
});