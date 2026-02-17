import fp from "fastify-plugin";
import { hrUpdateProjectMemberRoles } from "../methods/hrUpdateProjectMemberRoles.js";
import { hrUpdateProjectMemberRolesSchema } from "../schemas/hrUpdateProjectMemberRolesSchema.js";

export default fp(async function hrUpdateProjectMemberRolesRoute(fastify) {
  fastify.post("/hr/project/update-member-roles", async (request, reply) => {
    try {
      const parsed = hrUpdateProjectMemberRolesSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "hr_project_update_roles_bad_body ||| 071");
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrUpdateProjectMemberRoles(authHeader, parsed.data);

      reply.header("x-auth-sign", "hr_project_update_roles_ok ||| 072");
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update project member roles");
      reply.header("x-auth-sign", "hr_project_update_roles_err ||| 073");
      return reply.code(400).send({ status: "error", message: error.message || "Failed to update project member roles" });
    }
  });
});