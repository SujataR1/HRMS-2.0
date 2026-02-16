import fp from "fastify-plugin";
import { hrUnassignTeamMembers } from "../methods/hrUnassignTeamMembers.js";
import { hrUnassignTeamMembersSchema } from "../schemas/hrUnassignTeamMembersSchema.js";

export default fp(async function hrUnassignTeamMembersRoute(fastify) {
  fastify.post("/hr/team/unassign-members", async (request, reply) => {
    try {
      const parsed = hrUnassignTeamMembersSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "3c2b1a9d8c7b6a5f4e3d2c1b0a998877 ||| 11223344556677889900aabbccddeeffffeeddccbbaa00998877665544332211"
        );
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrUnassignTeamMembers(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "7f6e5d4c3b2a1908f7e6d5c4b3a29180 ||| 99aabbccddeeff0011223344556677888899aabbccddeeff0011223344556677"
      );
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to unassign team members");
      reply.header(
        "x-auth-sign",
        "0a1b2c3d4e5f60718293a4b5c6d7e8f9 ||| fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
      );
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to unassign team members",
      });
    }
  });
});