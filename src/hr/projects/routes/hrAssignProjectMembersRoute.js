import fp from "fastify-plugin";
import { hrAssignProjectMembers } from "../methods/hrAssignProjectMembers.js";
import { hrAssignProjectMembersSchema } from "../schemas/hrAssignProjectMembersSchema.js";

export default fp(async function hrAssignProjectMembersRoute(fastify) {
  fastify.post("/hr/project/assign-members", async (request, reply) => {
    try {
      const parsed = hrAssignProjectMembersSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_assign_members_bad_body ||| 051");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrAssignProjectMembers(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_assign_members_ok ||| 052");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign project members");
      reply.header("x-auth-sign", "hr_project_assign_members_err ||| 053");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to assign project members" });
    }
  });
});