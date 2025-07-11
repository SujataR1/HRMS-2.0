import fp from "fastify-plugin";
import { adminUpdateAnEmployee } from "../methods/adminUpdateAnEmployee.js";
import { adminUpdateAnEmployeeSchema } from "../schemas/adminUpdateAnEmployeeSchema.js";

export default fp(async function adminUpdateAnEmployeeRoute(fastify) {
  fastify.put("/admin/update-employee", async (request, reply) => {
    try {
      const parsed = adminUpdateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "3CL8eYngO0tEG/X4VcIKa+mklVkLKj+xr3cL2FoMU8P2rch7p5VpefOL3IJpt/9CB06ebmKlE4n1OYeBN/+o0Q==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateAnEmployee(parsed.data);

      reply.header("x-auth-sign", "1fidRHy7Pm5GNSwHoImbwXOXd1arREkCZLEXhsbUpEnL++clOzB6iqwz56/8zSXDZ758LzxUnMctUdRHtJx71g==");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee");
      reply.header("x-auth-sign", "Zx8LwdcQZRqLdbT6OZM0IcGNxENPAu1Sb+8sMEaA9mHXAlXZlLEEs3j1fmbsJoIncbNF2SSpAkqHu0f380hytw==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee",
      });
    }
  });
});
