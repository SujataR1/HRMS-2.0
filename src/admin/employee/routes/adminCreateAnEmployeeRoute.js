import fp from "fastify-plugin";
import { adminCreateAnEmployee } from "../methods/adminCreateAnEmployee.js";
import { adminCreateAnEmployeeSchema } from "../schemas/adminCreateAnEmployeeSchema.js";

export default fp(async function adminCreateAnEmployeeRoute(fastify) {
  fastify.post("/admin/create-employee", async (request, reply) => {
    try {
      const parsed = adminCreateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "IUoW/z+9pQqUgeJ1ptTrDEgFHBuPia9P2GyRN9oiGr40aSAagudMwE2Pi+9HoS4bKjvbmPRNJGKxsheRCIRUHg==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateAnEmployee(parsed.data, request.meta);

      reply.header("x-auth-sign", "POw3Bx9Im+3K8yhmvgLhbSCU1cw1syU1IZ9iZ0uBNk4fIjNMom88dn/tcN2RjjbsziF2C4iP709wCP2nC3xi3w==");
      return reply.code(200).send({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to register employee");
      reply.header("x-auth-sign", "eToyYQ5E97z1C/L3Zdq+26EZ4tSA7KG4EBet8/iqrM1VlW/JmtROiKUiHYom6/x7ymbQxqoPi0A9nhVi8dmYfA==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to register employee",
      });
    }
  });
});
