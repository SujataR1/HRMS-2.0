import fp from "fastify-plugin";
import { hrRequestStatusChange } from "../methods/hrRequestStatusChange.js";
import { hrRequestStatusChangeSchema } from "../schemas/hrRequestStatusChangeSchema.js";

export default fp(async function hrRequestStatusChangeRoute(fastify) {
  fastify.post("/hr/task/request-status-change", async (request, reply) => {
    try {
      const parsed = hrRequestStatusChangeSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_request_status_bad_body ||| 131");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrRequestStatusChange(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_request_status_ok ||| 132");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to request status change");
      reply.header("x-auth-sign", "hr_task_request_status_err ||| 133");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to request status change" });
    }
  });
});