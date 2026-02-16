import fp from "fastify-plugin";
import { hrAssignTeamMembers } from "../methods/hrAssignTeamMembers.js";
import { hrAssignTeamMembersSchema } from "../schemas/hrAssignTeamMembersSchema.js";

export default fp(async function hrAssignTeamMembersRoute(fastify) {
  fastify.post("/hr/team/assign-members", async (request, reply) => {
    try {
      const parsed = hrAssignTeamMembersSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "5b2c2c2e9a0b4f2f8d0a1c3f2b1a9d8c ||| 71a0c3d2b1e4f5a6978877665544332211ffeeddccbbaa009988776655443322"
        );
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrAssignTeamMembers(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "1c9fbd3a2f8e4e0db5c1a2f3e4d5c6b7 ||| aabbccddeeff0011223344556677889900ffeeddccbbaa998877665544332211"
      );
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to assign team members");
      reply.header(
        "x-auth-sign",
        "a9d8c7b6e5f4a3b2c1d0e0f1a2b3c4d5 ||| 0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff"
      );
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to assign team members",
      });
    }
  });
});