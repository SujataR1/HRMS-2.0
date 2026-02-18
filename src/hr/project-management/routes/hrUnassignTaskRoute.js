import fp from "fastify-plugin";
import { hrUnassignTask } from "../methods/hrUnassignTask.js";
import { hrUnassignTaskSchema } from "../schemas/hrUnassignTaskSchema.js";

export default fp(async function hrUnassignTaskRoute(fastify) {
  fastify.post("/hr/task/unassign", async (request, reply) => {
    try {
      const parsed = hrUnassignTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_unassign_bad_body ||| 111");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrUnassignTask(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_unassign_ok ||| 112");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to unassign task");
      reply.header("x-auth-sign", "hr_task_unassign_err ||| 113");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to unassign task" });
    }
  });
});