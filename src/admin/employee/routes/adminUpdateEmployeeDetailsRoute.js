import fp from "fastify-plugin";
import { adminUpdateEmployeeDetails } from "../methods/adminUpdateEmployeeDetails.js";
import { adminUpdateEmployeeDetailsSchema } from "../schemas/adminUpdateEmployeeDetailsSchema.js";

export default fp(async function adminUpdateEmployeeDetailsRoute(fastify) {
  fastify.put("/admin/update-employee-details", async (request, reply) => {
    try {
      const parsed = adminUpdateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "ddeHTb6zXtZYdNHvsQ2/nr/2E45iAU/Kka/bGlHb7dcbqUhH9wXCTrwC8tV7Zo/RzZWJ3fAvk/vGnuJGg9N2Eg==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "KZC1kNCmoedNQeB07BXDQndz6X1NSX5wd0+1RLWjSPMXHJ1WqCBJzywsGeGB10FphwTZSMH+YjOF5aMMEn7q2Q==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee details");
      reply.header("x-auth-sign", "6MSw0s849qJMsqzSWLAmWrVrdboAtRph53qWORIu8Ncnm7v3Tq2lxQnC7OyJSoV6Ue4WZblVKO+RQUaBx5EC1g==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee details",
      });
    }
  });
});
