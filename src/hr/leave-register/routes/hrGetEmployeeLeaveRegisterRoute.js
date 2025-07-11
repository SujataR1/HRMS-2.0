import fp from "fastify-plugin";
import { hrGetEmployeeLeaveRegister } from "../methods/hrGetEmployeeLeaveRegister.js";
import { hrGetEmployeeLeaveRegisterSchema } from "../schemas/hrGetEmployeeLeaveRegisterSchema.js";

export default fp(async function hrGetEmployeeLeaveRegisterRoute(fastify) {
  fastify.get("/hr/get-leave-register", async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const query = hrGetEmployeeLeaveRegisterSchema.safeParse(request.query);

      if (!query.success) {
        reply.header("x-auth-sign", "37c8e5adf8271868d78eaa9af2f43aa9 ||| 24390cfdfc188288cdf735aa7d10b3da7bf157f31a6116dbdbb4535f325e94a28d649643818c6921bd758fd1df3b269c");
        return reply.code(400).send({
          status: "error",
          issues: query.error.issues,
        });
      }

      const result = await hrGetEmployeeLeaveRegister(authHeader, query.data.employeeId);

      reply.header("x-auth-sign", "9b6084df371101c98e417e8415305567 ||| 9db1d6880a014b58d0db8a9ff2d9e120585f70a704afbfc8de1cb83be92041e63a046a5a3d415438a7d86a1d51b3acc0");
      return reply.code(200).send({
        status: "success",
        data: result.data,
      });
    } catch (err) {
      request.log.error({ err }, "🔥 Failed to fetch leave register");
      reply.header("x-auth-sign", "231c74ca888ba1179bc0a506f4b4348a ||| fdde18bb6a117d4881d7e456931c8cf530fcb56c2df3de4a9fddc5bee9cba38e890d26bce424552f364eeb0c2acbc7ba");
      return reply.code(400).send({
        status: "error",
        message: err.message || "Unexpected error occurred",
      });
    }
  });
});
