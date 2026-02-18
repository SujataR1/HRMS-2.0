import fp from "fastify-plugin";
import { hrRejectStatusChange } from "../methods/hrRejectStatusChange.js";
import { hrRejectStatusChangeSchema } from "../schemas/hrRejectStatusChangeSchema.js";

export default fp(async function hrRejectStatusChangeRoute(fastify) {
  fastify.post("/hr/task/reject-status-change", async (request, reply) => {
    try {
      const parsed = hrRejectStatusChangeSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_reject_status_bad_body ||| 151");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrRejectStatusChange(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_reject_status_ok ||| 152");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to reject status change");
      reply.header("x-auth-sign", "hr_task_reject_status_err ||| 153");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to reject status change" });
    }
  });
});