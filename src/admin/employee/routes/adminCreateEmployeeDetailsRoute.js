import fp from "fastify-plugin";
import { adminCreateEmployeeDetails } from "../methods/adminCreateEmployeeDetails.js";
import { adminCreateEmployeeDetailsSchema } from "../schemas/adminCreateEmployeeDetailsSchema.js";

export default fp(async function adminCreateEmployeeDetailsRoute(fastify) {
  fastify.post("/admin/create-employee-details", async (request, reply) => {
    try {
      const parsed = adminCreateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "FUPfvLWOq+pGvMy6nSiNse/Y0p+4BOXHgscEZO/Uz5WNl9x0klYWHLmH3PVOjmAsehiy+GhmYwVuU72pNY2PIg==");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "zcgswWU5ZMD+cuhAvbESwJAGqa4UCdahJRycImEIIDBPymKbeV0eUTiHL3RYTmTzevk/bXJC+im8iffYNt9lAA==");
      return reply.code(201).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create employee details");
      reply.header("x-auth-sign", "Qab2/X8ujJYKbhZpJUEx3TRQu1gPLuf5qr7yysWxpqpbcHuxmLoegYbOWPQFAV7b3qEHmANsDaR+QW0nnhY2vw==");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create employee details",
      });
    }
  });
});
