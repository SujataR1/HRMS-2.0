import fp from "fastify-plugin";
import { hrGetTaskTimeline } from "../methods/hrGetTaskTimeline.js";
import { hrGetTaskTimelineSchema } from "../schemas/hrGetTaskTimelineSchema.js";

export default fp(async function hrGetTaskTimelineRoute(fastify) {
  fastify.post("/hr/task/get-timeline", async (request, reply) => {
    try {
      const parsed = hrGetTaskTimelineSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_task_get_timeline_bad_body ||| 201");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetTaskTimeline(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_task_get_timeline_ok ||| 202");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get task timeline");
      reply.header("x-auth-sign", "hr_task_get_timeline_err ||| 203");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to get task timeline",
      });
    }
  });
});