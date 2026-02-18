import fp from "fastify-plugin";
import { hrCreateTask } from "../methods/hrCreateTask.js";
import { hrCreateTaskSchema } from "../schemas/hrCreateTaskSchema.js";

export default fp(async function hrCreateTaskRoute(fastify) {
  fastify.post("/hr/task/create", async (request, reply) => {
    try {
      const parsed = hrCreateTaskSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_create_bad_body ||| 001");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrCreateTask(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_create_ok ||| 002");
      return reply.code(201).send(result);

    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create task");

      reply.header("x-auth-sign", "hr_task_create_err ||| 003");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create task",
      });
    }
  });
});