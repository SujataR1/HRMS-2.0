import fp from "fastify-plugin";
import { adminCreateEmployeeDetails } from "../methods/adminCreateEmployeeDetails.js";
import { adminCreateEmployeeDetailsSchema } from "../schemas/adminCreateEmployeeDetailsSchema.js";

export default fp(async function adminCreateEmployeeDetailsRoute(fastify) {
  fastify.post("/admin/create-employee-details", async (request, reply) => {
    try {
      const parsed = adminCreateEmployeeDetailsSchema.safeParse(request.body);

      if (!parsed.success) {
        reply.header("x-auth-sign", "b9886b25acab867906e2033fe6e71388 ||| 552d593c3cb08256edf49a597bc5e88fa19743e51fb219c2f2844d210817cb423aea82130a3aab7fbc60a8e5ea2bb4e5");
        return reply.code(400).send({
          status: "error",
          issues: parsed.error.issues,
        });
      }

      const result = await adminCreateEmployeeDetails(parsed.data);

      reply.header("x-auth-sign", "8746f76f021e8a09e9732ed604e3d614 ||| 3e0f94fc96731c8385ad7863bd7c0b0f868ca88fd7cc1bb80d4f1e9edac4a182b55fa5c9c2f215567022258ed94254ad");
      return reply.code(201).send({
        status: "success",
        data: result,
      });
    } catch (error) {
      request.log.error({ err: error }, "❌ Failed to create employee details");
      reply.header("x-auth-sign", "41a69d5a26bc6023bfb4837943d982f3 ||| d75f00f43e3da536d600ae38819a1abfee37a24f4a1148e07b3a18099d1d86468f802df16a60156dc0bf27d20d43de81");
      return reply.code(400).send({
        status: "error",
        message: error.message || "Failed to create employee details",
      });
    }
  });
});
