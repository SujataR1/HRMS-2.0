import fp from "fastify-plugin";
import { hrUpdateTeamMemberRoles } from "../methods/hrUpdateTeamMemberRoles.js";
import { hrUpdateTeamMemberRolesSchema } from "../schemas/hrUpdateTeamMemberRolesSchema.js";

export default fp(async function hrUpdateTeamMemberRolesRoute(fastify) {
  fastify.post("/hr/team/update-member-roles", async (request, reply) => {
    try {
      const parsed = hrUpdateTeamMemberRolesSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "1a2b3c4d5e6f708192a3b4c5d6e7f809 ||| 00112233445566778899aabbccddeeff11223344556677889900aabbccddeeff"
        );
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrUpdateTeamMemberRoles(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "99aabbccddeeff001122334455667788 ||| a1b2c3d4e5f60718293a4b5c6d7e8f900ffeeddccbbaa998877665544332211"
      );
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update team member roles");
      reply.header(
        "x-auth-sign",
        "abcdef0123456789abcdef0123456789 ||| fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
      );
      return reply.code(400).send({ status: "error", message: error.message || "Failed to update team member roles" });
    }
  });
});