import fp from "fastify-plugin";
import { adminGetAllEmployeeProfile } from "../methods/adminGetAllEmployeeProfile.js";

export default fp(async function adminGetAllEmployeeProfileRoute(fastify) {
  fastify.get("/admin/employee-profiles", async (request, reply) => {
    try {
      const result = await adminGetAllEmployeeProfile();

      reply.header("x-auth-sign", "9a7df1a598151b99e511fedb7ad1294a ||| 6c47e5f4b144c4cc40e81fefe0967308dc58194e3eac28a1774d4e1f25d16ef3bb5f1c681f1946249f2c5d9015f6eedb");
      return reply.code(200).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to fetch employee profiles");
      reply.header("x-auth-sign", "efd49800f774c6dc0c7925809dde02c7 ||| 54c013c8191fdb54c16ee1ce2b0882a7527358f9b55a10e7c06f212081464461e4464d19e2f01be0b7c7b6e0d07d1a57");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to fetch employee profiles",
      });
    }
  });
});
