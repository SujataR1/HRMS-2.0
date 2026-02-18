import fp from "fastify-plugin";
import { hrGetTaskStatusHistory } from "../methods/hrGetTaskStatusHistory.js";
import { hrGetTaskStatusHistorySchema } from "../schemas/hrGetTaskStatusHistorySchema.js";

export default fp(async function hrGetTaskStatusHistoryRoute(fastify) {
  fastify.post("/hr/task/get-status-changes", async (request, reply) => {
    try {
      const parsed = hrGetTaskStatusHistorySchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_get_status_history_bad_body ||| 161");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetTaskStatusHistory(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_get_status_history_ok ||| 162");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get task status history");
      reply.header("x-auth-sign", "hr_task_get_status_history_err ||| 163");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get task status history" });
    }
  });
});