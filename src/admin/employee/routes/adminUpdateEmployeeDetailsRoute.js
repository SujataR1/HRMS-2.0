import fp from "fastify-plugin";
import { adminUpdateEmployeeDetails } from "../methods/adminUpdateEmployeeDetails.js";
import { adminUpdateEmployeeDetailsSchema } from "../schemas/adminUpdateEmployeeDetailsSchema.js";

export default fp(async function adminUpdateEmployeeDetailsRoute(fastify) {
  fastify.put("/admin/update-employee-details", async (request, reply) => {
    try {
      const parsed = adminUpdateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "bc55dfc4092db81293c3a485dfb5cd07 ||| 19af271220b73ef56bc0473cdeec8ecddf0bc129af0dc5b55a7e4a358b0be3fcfa2f04137186a26538d41db74ca1e98e");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "22d5c7ca700ad0a8aa690d14552e375d ||| fcaa4959938a90d84c5d3d8f46f60e9fd74e70e67d10652b736d590162fe159cc62e43849c08045372d5ace691d0b8d9");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee details");
      reply.header("x-auth-sign", "8ee949ba7d085ddf678c74e8da30696d ||| 83719323b9cb6aadf9530aae4eaaaeec0014b84c26d59e1b98d50ffd37740e37d421bdbf9a74c031056106b62a8a59f8");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee details",
      });
    }
  });
});
