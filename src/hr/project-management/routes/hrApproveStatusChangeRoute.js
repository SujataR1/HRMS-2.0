import fp from "fastify-plugin";
import { hrApproveStatusChange } from "../methods/hrApproveStatusChange.js";
import { hrApproveStatusChangeSchema } from "../schemas/hrApproveStatusChangeSchema.js";

export default fp(async function hrApproveStatusChangeRoute(fastify) {
  fastify.post("/hr/task/approve-status-change", async (request, reply) => {
    try {
      const parsed = hrApproveStatusChangeSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_approve_status_bad_body ||| 141");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrApproveStatusChange(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_approve_status_ok ||| 142");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to approve status change");
      reply.header("x-auth-sign", "hr_task_approve_status_err ||| 143");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to approve status change" });
    }
  });
});