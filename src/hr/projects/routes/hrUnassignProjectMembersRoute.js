import fp from "fastify-plugin";
import { hrUnassignProjectMembers } from "../methods/hrUnassignProjectMembers.js";
import { hrUnassignProjectMembersSchema } from "../schemas/hrUnassignProjectMembersSchema.js";

export default fp(async function hrUnassignProjectMembersRoute(fastify) {
  fastify.post("/hr/project/unassign-members", async (request, reply) => {
    try {
      const parsed = hrUnassignProjectMembersSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_unassign_members_bad_body ||| 061");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrUnassignProjectMembers(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_unassign_members_ok ||| 062");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to unassign project members");
      reply.header("x-auth-sign", "hr_project_unassign_members_err ||| 063");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to unassign project members" });
    }
  });
});