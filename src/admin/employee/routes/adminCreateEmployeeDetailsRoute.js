import fp from "fastify-plugin";
import { adminCreateEmployeeDetails } from "../methods/adminCreateEmployeeDetails.js";
import { adminCreateEmployeeDetailsSchema } from "../schemas/adminCreateEmployeeDetailsSchema.js";

export default fp(async function adminCreateEmployeeDetailsRoute(fastify) {
  fastify.post("/admin/create-employee-details", async (request, reply) => {
    try {
      const parsed = adminCreateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "zIH9sD13fuwnunQVaPmBOfNY24F6KstU01KDc0S0nlznMYDUZ3Lutnu+8mzauMHCQJ3FloqZkV/Db1e5hKBzuA==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "Gn+MiFBKhOJCWCDYa5MmO+TC2vXkjFQ9gKltzCtNYodrzU66VPjAW1556u8PREcwIbGXpu4HJcXH1ZyuIZGj4g==");
      return reply.code(201).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create employee details");
      reply.header("x-auth-sign", "EWEIMLIKkH3MclDtWyxj4xscMqRku9hY6bYS5g7orB6R7poZTy/9hNBzgKnHpxoXv3mYMhirBCJTlrjp0hGSpw==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create employee details",
      });
    }
  });
});
