import fp from "fastify-plugin";
import { adminCreateEmployeeDetails } from "../methods/adminCreateEmployeeDetails.js";
import { adminCreateEmployeeDetailsSchema } from "../schemas/adminCreateEmployeeDetailsSchema.js";

export default fp(async function adminCreateEmployeeDetailsRoute(fastify) {
  fastify.post("/admin/create-employee-details", async (request, reply) => {
    try {
      const parsed = adminCreateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateEmployeeDetails(parsed.data);

      return reply.code(201).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create employee details");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create employee details",
      });
    }
  });
});
