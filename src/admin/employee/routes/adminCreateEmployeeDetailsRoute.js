import fp from "fastify-plugin";
import { adminCreateEmployeeDetails } from "../methods/adminCreateEmployeeDetails.js";
import { adminCreateEmployeeDetailsSchema } from "../schemas/adminCreateEmployeeDetailsSchema.js";

export default fp(async function adminCreateEmployeeDetailsRoute(fastify) {
  fastify.post("/admin/create-employee-details", async (request, reply) => {
    try {
      const parsed = adminCreateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "57025b88f0dcb213f525115c67704fb9 ||| 79e9bd071e14d5ffd6e0bbe18285e165bdbd0d089a0fc6a501570e4aada0885aaf6fe6b41f9b817b71fefcfd1a67dbed");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "28635e1904cbbf9dafb3286614256e3c ||| c6a62dcd503f971234c9d52e96ee327359425fd420652ef8766aeb0271ab7da5c2028128511bc235aa32e7c9025d8bf2");
      return reply.code(201).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create employee details");
      reply.header("x-auth-sign", "baf5792ef05cb1c057177f3a343d5349 ||| be1b3e4e197273cf12a0cc9d59cdf1a285b9df21d93797ddbe846ff8ba521b119cc1aefe6c362bd2f145db1368b94d61");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create employee details",
      });
    }
  });
});
