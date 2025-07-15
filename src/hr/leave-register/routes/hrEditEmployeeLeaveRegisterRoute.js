import fp from "fastify-plugin";
import { hrEditEmployeeLeaveRegister } from "../methods/hrEditEmployeeLeaveRegister.js";
import { hrEditEmployeeLeaveRegisterSchema } from "../schemas/hrEditEmployeeLeaveRegisterSchema.js";

export default fp(async function hrEditEmployeeLeaveRegisterRoute(fastify) {
  fastify.post("/hr/edit-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;

      const parsed = hrEditEmployeeLeaveRegisterSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.header("x-auth-sign", "46379a3303cbd44a662699ec73fb8566 ||| fdde03450c203ca015b8535f7864e4216fda148af7eabc052fb8b1f8ad52afcd8d297c0d16e7390311fd4e0d0f15b8b4");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await hrEditEmployeeLeaveRegister(authHeader, parsed.data);

      reply.header("x-auth-sign", "a0dcab0e21f922e09b097be8bd901ba6 ||| 45150fdc53de56dacb2665eec14bc3966b477496cd699678f842e1cc40b1ad1d66a558fee5b1bd7707f6745e3ef9469c");
      return reply.code(200).send({
        status: "success",
        message: result.message,
        data: result.updated,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to edit leave register");
      reply.header("x-auth-sign", "649dda13494a7fdf82a1714aeae7cfe1 ||| 08a0edc508d87a0b7e72f6b0f8fd4605f91b5f566722b6331b1d56c3a3388c9dfed1be118d9534083256348357f9a76a");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
