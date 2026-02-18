import fp from "fastify-plugin";
import { hrAssignTask } from "../methods/hrAssignTask.js";
import { hrAssignTaskSchema } from "../schemas/hrAssignTaskSchema.js";

export default fp(async function hrAssignTaskRoute(fastify) {
  fastify.post("/hr/task/assign", async (request, reply) => {
    try {
      const parsed = hrAssignTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_assign_bad_body ||| 101");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrAssignTask(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_assign_ok ||| 102");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign task");
      reply.header("x-auth-sign", "hr_task_assign_err ||| 103");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to assign task" });
    }
  });
});