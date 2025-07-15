import fp from "fastify-plugin";
import { adminUpdateAnEmployee } from "../methods/adminUpdateAnEmployee.js";
import { adminUpdateAnEmployeeSchema } from "../schemas/adminUpdateAnEmployeeSchema.js";

export default fp(async function adminUpdateAnEmployeeRoute(fastify) {
  fastify.put("/admin/update-employee", async (request, reply) => {
    try {
      const parsed = adminUpdateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "6f3d0802f57a67cfe7a1b8d92c0f0b29 ||| 36139acc95c5e3aca27fa6d88ae0b6e1bb9ad6418b3b31c1249c012b6dfd29f522693b8f871368639cc6fd9272971790");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateAnEmployee(parsed.data);

      reply.header("x-auth-sign", "09cd0d59885688695b8a61ff9f4f9a10 ||| c81ce15654783a9b621925cd2f4245ae864ee76225223abcf4e5c78e0269067a356f62a18e00cbb47a863d3904eacc02");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee");
      reply.header("x-auth-sign", "b075e89310a4f5a65630025685398bc5 ||| 048266b3ad1d72e87f96633e8422fa4dcc98be0ac86147ebe12d6321ac2c6cfa378eb9be660033bc2fd1816edef5776d");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee",
      });
    }
  });
});
