import fp from "fastify-plugin";
import { adminCreateAnEmployee } from "../methods/adminCreateAnEmployee.js";
import { adminCreateAnEmployeeSchema } from "../schemas/adminCreateAnEmployeeSchema.js";

export default fp(async function adminCreateAnEmployeeRoute(fastify) {
  fastify.post("/admin/create-employee", async (request, reply) => {
    try {
      const parsed = adminCreateAnEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "a9886c43ecc82a50412ad7a9615f5380 ||| 9f50e2624b1cbe2ebb39e362c86e6db40a1f9b55678117304a66c633ec021cc51de77e0fa7ff2f43aaad3a37db0c07d7");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateAnEmployee(parsed.data, request.meta);

      reply.header("x-auth-sign", "6e6e908911c775ad9c91811ef3d5b5bb ||| 7cedb94be0d5047645c85a34638aa72fa591db90e7215265cfa05756d40f43e93db02b384732f42cc37cca0172f50f16");
      return reply.code(200).send({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to register employee");
      reply.header("x-auth-sign", "782a37e79ebd9cac5e01499e6021e372 ||| b1994943e62e72aa904b7d4ce05f6dcd3ae75a52c16d3afec034c74946d7cc023480a626bf317137aa506816303ea5f0");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to register employee",
      });
    }
  });
});
