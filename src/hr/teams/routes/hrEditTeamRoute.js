import fp from "fastify-plugin";
import { hrEditTeam } from "../methods/hrEditTeam.js";
import { hrEditTeamSchema } from "../schemas/hrEditTeamSchema.js";

export default fp(async function hrEditTeamRoute(fastify) {
  fastify.post("/hr/team/edit", async (request, reply) => {
    try {
      const parsed = hrEditTeamSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "8f3d3d0c1a2b4c5d6e7f8091a2b3c4d5 ||| 00112233445566778899aabbccddeeffffeeddccbbaa00998877665544332211"
        );
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrEditTeam(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "1e2d3c4b5a69788796a5b4c3d2e1f001 ||| aabbccddeeff0011223344556677889900ffeeddccbbaa998877665544332211"
      );
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to edit team");
      reply.header(
        "x-auth-sign",
        "c0ffee12deadbeef00aa11bb22cc33dd ||| fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
      );
      return reply.code(400).send({ status: "error", message: error.message || "Failed to edit team" });
    }
  });
});