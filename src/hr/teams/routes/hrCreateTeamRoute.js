import fp from "fastify-plugin";
import { hrCreateTeam } from "../methods/hrCreateTeam.js";
import { hrCreateTeamSchema } from "../schemas/hrCreateTeamSchema.js";

export default fp(async function hrCreateTeamRoute(fastify) {
  fastify.post("/hr/team/create", async (request, reply) => {
    try {
      const parsed = hrCreateTeamSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "0c9b7d6d0ab2a7f7d3d2ad7d7c0d8b5e ||| 8d73b1a2c9d404c8f2a1b8c44f92e7a0c93b7a5e3d1a2f9b7c6d5e4f3a2b1c0d"
        );
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await hrCreateTeam(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "a1d7c29c5c3f4b61a8f20f0f2f0b7c9d ||| 1f2e3d4c5b6a79808f9e0d1c2b3a4958675647382910fedcba9876543210abcd"
      );
      return reply.code(201).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create team");
      reply.header(
        "x-auth-sign",
        "e2f1c3b4a5d6e7980f1e2d3c4b5a6978 ||| 9a8b7c6d5e4f3a2b1c0dffeeddccbbaa99887766554433221100aabbccddeeff"
      );
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create team",
      });
    }
  });
});