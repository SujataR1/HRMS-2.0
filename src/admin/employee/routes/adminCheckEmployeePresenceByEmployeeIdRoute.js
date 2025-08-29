import fp from "fastify-plugin";
import { adminCheckEmployeePresenceByEmployeeId } from "../methods/adminCheckEmployeePresenceByEmployeeId.js";
import { adminCheckEmployeePresenceByEmployeeIdSchema } from "../schemas/adminCheckEmployeePresenceByEmployeeIdSchema.js";

export default fp(async function adminCheckEmployeePresenceByEmployeeIdRoute(fastify) {
  fastify.post("/admin/check-employee-presence", async (request, reply) => {
    try {
      const parsed = adminCheckEmployeePresenceByEmployeeIdSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header(
          "x-auth-sign",
          "2f7735fa66a80d5ea968529d1326f7ab ||| 3d25b098782f9a3721de983a04b718146a15e51e11b000bb3ac8a6fd80eb6e14b7d2e00edad145a38934e819a4220da3"
        );
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const authHeader = request.headers.authorization;
      const result = await adminCheckEmployeePresenceByEmployeeId(authHeader, parsed.data);

      reply.header(
        "x-auth-sign",
        "39303782fab04d0a96ccb740dbaca597 ||| 72db3803e3343e436620f80061a5577b24ef258aa3199d7626afe8d8d42b01a55f4480614c44d363f629cd6b43a5c79d"
      );
      // per your requirement: return exactly {"presence":"true"} or {"presence":"false"}
      return reply.code(200).send(result);
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to check employee presence");
      reply.header(
        "x-auth-sign",
        "b95e6bd8fe1f9569ee1a835ae226a9a8 ||| 0f3cdfede3e23490ae7518f8274485c753375a3fdf84fd01d5dee3e45cd1dff8d3998b5db79eac30a0a71fb793ed801a"
      );
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to check employee presence",
      });
    }
  });
});
