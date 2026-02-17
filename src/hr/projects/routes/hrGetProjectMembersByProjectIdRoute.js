import fp from "fastify-plugin";
import { hrGetProjectMembersByProjectId } from "../methods/hrGetProjectMembersByProjectId.js";
import { hrGetProjectMembersByProjectIdSchema } from "../schemas/hrGetProjectMembersByProjectIdSchema.js";

export default fp(async function hrGetProjectMembersByProjectIdRoute(fastify) {
  fastify.post("/hr/project/get-members", async (request, reply) => {
    try {
      const parsed = hrGetProjectMembersByProjectIdSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_get_members_bad_body ||| 041");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetProjectMembersByProjectId(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_get_members_ok ||| 042");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get project members");
      reply.header("x-auth-sign", "hr_project_get_members_err ||| 043");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get project members" });
    }
  });
});