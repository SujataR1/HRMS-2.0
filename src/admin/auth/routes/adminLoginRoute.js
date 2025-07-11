import fp from "fastify-plugin";
import { adminLogin } from "../methods/adminLogin.js";
import { adminLoginSchema } from "../schemas/adminLoginSchema.js";

export default fp(async function adminLoginRoute(fastify) {
	fastify.post("/admin/login", async (request, reply) => {
		try {
			const parsed = adminLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "c1VgHvooSajqpidng4UqWWjCCPrioiSDF+FKbUyDHoXGiyyhQD+CcrorSGZmbLDJsSsMhjnHoQ0ij0QX+6Xtfg==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminLogin(parsed.data, request.meta);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "F654zs153vxnRfNy5YYXIKjTmFrHQ3JotkcPZCn2L890C+YF+9my2knBVoqTF961+JXcdjUWIWE2z1+AJULLCQ==");
				return reply.code(200).send({
					status: "success",
					requires2FA: true,
				});
			}

			reply
				.header("Authorization", `Bearer ${result.token}`)
				.code(200)
				.send({
					status: "success",
					authorization: `Bearer ${result.token}`
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin login failed");
			reply.header("x-auth-sign", "tutHJQu1K8RpQDzlb+wZlzJgaGyMZSfZLW5leG9wxyWY4UE9jFq8nP4Y1v5vGbW1uowajErvGYNoMIVITsl5YA==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});
