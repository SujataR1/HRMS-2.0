import fp from "fastify-plugin";
import { hrEditEmployeeLeaveRegister } from "../methods/hrEditEmployeeLeaveRegister.js";
import { hrEditEmployeeLeaveRegisterSchema } from "../schemas/hrEditEmployeeLeaveRegisterSchema.js";

export default fp(async function hrEditEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/edit-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;

      const parsed = hrEditEmployeeLeaveRegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "mZC7tBuIcArgfNCBRWigaHG+uH6NukoPBhzAD8MafqA5GMoIhXlb7rE/PL0vCf5MaWleiGlNYNtUSmi/JINbAg==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrEditEmployeeLeaveRegister(authHeader, parsed.data);

      reply.header("x-auth-sign", "1NHOwkbTkl94GFTZcdmPysdF0BwsV7BJ15a6xXOmZm4isoMuBb9jvmq3kIAb558p3Z9PJTIQfLs6zg2xem5v3Q==");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to edit leave register");
      reply.header("x-auth-sign", "5MlStzF412t+Sffjdrq8ehXsPnSSkBiAFVTkyuLdvWyqm7XFlr91dm+LEsjkGugh264CyxNFnzfyyCzX0aGZtw==");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
