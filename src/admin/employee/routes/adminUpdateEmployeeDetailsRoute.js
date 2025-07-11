import fp from "fastify-plugin";
import { adminUpdateEmployeeDetails } from "../methods/adminUpdateEmployeeDetails.js";
import { adminUpdateEmployeeDetailsSchema } from "../schemas/adminUpdateEmployeeDetailsSchema.js";

export default fp(async function adminUpdateEmployeeDetailsRoute(fastify) {
  fastify.put("/admin/update-employee-details", async (request, reply) => {
    try {
      const parsed = adminUpdateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "a25ea669404c5b4d6089817fa3455a66 ||| 976442e67cc8a716573557a02271c6f5e8c16e11ab53b7c6d39101d096db346c505e44d28feacc77991d67b3a879da7c");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "30eb5bff1eb435570cb6fbe8d313f056 ||| fb3bd779eb6291f9eed8ef08a064002f5fbfef7417cb897eee467f53282f62f4b9c63973867082817c94a824285bb0f0");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee details");
      reply.header("x-auth-sign", "8fa97430b7c12ee03fbc4eb970e1fb28 ||| e24edd78b1ddeb0987f4f6572e3442b90621399429c757cc549c4d4be157a37a318181c80209b271e162af7794ec49ba");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee details",
      });
    }
  });
});
