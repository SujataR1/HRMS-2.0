import fp from "fastify-plugin";
import { hrGetMembersByTeamId } from "../methods/hrGetMembersByTeamId.js";
import { hrGetMembersByTeamIdSchema } from "../schemas/hrGetMembersByTeamIdSchema.js";

export default fp(async function hrGetMembersByTeamIdRoute(fastify) {
  fastify.post("/hr/team/get-members", async (request, reply) => {
    try {
      const parsed = hrGetMembersByTeamIdSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "33445566778899aabbccddeeff001122 ||| 00112233445566778899aabbccddeeff11223344556677889900aabbccddeeff"
        );
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetMembersByTeamId(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "b16a2f8e4e0db5c1a2f3e4d5c6b7d8e9 ||| aabbccddeeff0011223344556677889900ffeeddccbbaa998877665544332211"
      );
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get team members");
      reply.header(
        "x-auth-sign",
        "deadbeefcafebabef00dbabe12345678 ||| fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
      );
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get team members" });
    }
  });
});