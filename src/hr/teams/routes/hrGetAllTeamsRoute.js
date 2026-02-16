import fp from "fastify-plugin";
import { hrGetAllTeams } from "../methods/hrGetAllTeams.js";
import { hrGetAllTeamsSchema } from "../schemas/hrGetAllTeamsSchema.js";

export default fp(async function hrGetAllTeamsRoute(fastify) {
  fastify.post("/hr/team/get-all", async (request, reply) => {
    try {
      const parsed = hrGetAllTeamsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "d9d1c3b4a5d6e7980f1e2d3c4b5a6978 ||| 0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff"
        );
        return reply.code(400).send({ status: "error", issues: parsed.error.issues });
      }

      const authHeader = request.headers.authorization;
      const result = await hrGetAllTeams(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "11223344556677889900aabbccddeeff ||| a1b2c3d4e5f60718293a4b5c6d7e8f900ffeeddccbbaa998877665544332211"
      );
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to get all teams");
      reply.header(
        "x-auth-sign",
        "aa11bb22cc33dd44ee55ff6677889900 ||| fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
      );
      return reply.code(400).send({ status: "error", message: error.message || "Failed to get all teams" });
    }
  });
});