import fp from "fastify-plugin";
import { hrGetEmployeeLeaveRegister } from "../methods/hrGetEmployeeLeaveRegister.js";
import { hrGetEmployeeLeaveRegisterSchema } from "../schemas/hrGetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrGetEmployeeLeaveRegisterRoute(fastify) {
  fastify.get("/hr/get-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const query = hrGetEmployeeLeaveRegisterSchema.safeParse(request.query);

      if (!query.success) {
        reply.header("x-auth-sign", "gpFS1pmtt4VH7F4SiM0GgohUtER+o9aVmzu++crk+4JpAPlxAwz5QxgXh4PPmYEhs83EjaAdbLlYqw1LUMgyrQ==");
        return reply.code(400).send({
          status: "error",
          issues: query.error.issues,
        });
      }

      const result = await hrGetEmployeeLeaveRegister(authHeader, query.data.employeeId);

      reply.header("x-auth-sign", "vDl1ydhF5i2GSqemniezoj6g7s14J+2kazQnab7NAac9MjnxuR1MLPakQP0kVoqZmT6Mocmkvaox/zFbB7P16Q==");
      return reply.code(200).send({
        status: "success",
        data: result.data,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to fetch leave register");
      reply.header("x-auth-sign", "RD0V99N3+Iczdm6hC5pEi8qqIVPDg/6HcR6GtF2H8he2yvwF8WOetgCKPSu60Hb7cB8snbngT1NiLsWlx0GF+w==");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
