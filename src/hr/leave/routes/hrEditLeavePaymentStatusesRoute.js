import fp from "fastify-plugin";
import { hrEditLeavePaymentStatuses } from "../methods/hrEditLeavePaymentStatuses.js";
import { hrEditLeavePaymentStatusesSchema } from "../schemas/hrEditLeavePaymentStatusesSchema.js";

export default fp(async function hrEditLeavePaymentStatusesRoute(fastify) {
  fastify.patch("/hr/leave/payment-status/edit", async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      reply.header(
        "x-auth-sign",
        "a5eccd3dec1490ea96a6e98dc40257de ||| 41cb861d6f95c84bf11f01e11cab95479520438e49ade19e975e963324aa05129bf9f1b71f6d3fbb1508559c79c61304"
      );
      return reply.code(401).send({
        status: "error",
        message: "Authorization header missing",
      });
    }

    const parsed = hrEditLeavePaymentStatusesSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.header(
        "x-auth-sign",
        "e16446295a29ef8b1b2d4245ae06e0c8 ||| e2fa14ebb33bd1155e0d4ccbd71dd71bf292fe478a4368fe722825a5e68c478b06821d5b15405e2221f62d3e5ad51745"
      );
      return reply.code(400).send({
        status: "error",
        message: "Invalid input",
        issues: parsed.error.flatten(),
      });
    }

    try {
      const result = await hrEditLeavePaymentStatuses(authHeader, parsed.data);
      reply.header(
        "x-auth-sign",
        "4db34c663fb83dfccfd89ca95677c980 ||| 71fa7a327156be3b0cebae22b68b7f863511cea7d1ed73638b43b41c3f44a9239fbde4d8e271205d6f5f756eb1cd6122"
      );
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (err) {
      request.log.error({ err }, "❌ HR leave payment status edit failed");
      reply.header(
        "x-auth-sign",
        "98574323e8f126f6fd8a97ec056f6097 ||| 09d86d8c167eccbb151f9ed000e55ec13a3bb3b6b2ca0d7d1fd807cca2d67d35e6f360f785fb515669a66de9a8a0d2e1"
      );
      return reply.code(500).send({
        status: "error",
        message: err.message || "Something went wrong",
      });
    }
  });
});
