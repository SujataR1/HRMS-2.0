import fp from "fastify-plugin";
import { adminUpdateAnEmployee } from "../methods/adminUpdateAnEmployee.js";
import { adminUpdateAnEmployeeSchema } from "../schemas/adminUpdateAnEmployeeSchema.js";

export default fp(async function adminUpdateAnEmployeeRoute(fastify) {
  fastify.put("/admin/update-employee", async (request, reply) => {
    try {
      const parsed = adminUpdateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "5588ad494c6782b3e84f23cf9d3ab4b1 ||| 7742f11523d4491c95e7b0688c834af01a4f384ead86750c8e7b7884c250c7aa855f66c87e68e768816f9f20001e837d");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminUpdateAnEmployee(parsed.data);

      reply.header("x-auth-sign", "6283a1af1c71351347bb0efc96040bb7 ||| 056783cd6c535d38078c73d3dbe793b8a90f2dced7f2faa8b57a3af9f84ed48e3239e4d4f46d1ff6ae9822684f5932c0");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to update employee");
      reply.header("x-auth-sign", "701d5b7818ab3ab02b584fad931275d4 ||| abb7760807200d36c39dc9fced688a6c864617f39c4b901f03540da97ecfaa8f3dbe9b0d6a92a7ad8b611bf351724aeb");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to update employee",
      });
    }
  });
});
