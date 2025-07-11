import fp from "fastify-plugin";
import { adminDemoteHR } from "../methods/adminDemoteHR.js";
import { adminDemoteHRSchema } from "../schemas/adminDemoteHRSchema.js";

export default fp(async function adminDemoteHRRoute(fastify) {
	fastify.post("/admin/demote-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			// Let verifyAdminJWT handle header validation
			const parsed = adminDemoteHRSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.header("x-auth-sign", "9aead3dccbbf8bbc42132f674e1b56e4 ||| 0f018da5fddfc92b2714240d3fd8646f5176d3b26b244c873bdd932916ed2c54be4aafc34bfb4666571abc27925c887c");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminDemoteHR(
				authHeader,
				parsed.data.employeeId
			);

			reply.header("x-auth-sign", "2451e84301a1343666a65c3ab837dd85 ||| 25fc44f371d0b2c236f936a09fa199dab6449fa7129265716fd336d59c2f0e73982cd6bb881593c5b15b45a7f4897de5");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to demote HR");
			reply.header("x-auth-sign", "0ee916383e81174b4811cf75a128e569 ||| 46b26be315ae14108243c64f8b226d6f4d65c005be6552c20b07824c71787c7c37f7c8e98c0540e5d080cbe2514af045");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to demote HR",
			});
		}
	});
});
