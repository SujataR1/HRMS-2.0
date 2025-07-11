import fp from "fastify-plugin";
import { employeeLogout } from "../methods/employeeLogout.js";

export default fp(async function employeeLogoutRoute(fastify) {
	fastify.post("/employee/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "ryAUt4+gHXbwXLepMLcFalBjO6ojyi0B2t/YlBc25a20xQGescOGFFgh3Ff1C2wCLT+OSw/mxrVpqFDfY+9cWw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await employeeLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "s92wd2r5htFkgTIUjF9RTvTCwvFX0CohEh70ZDj4vUO2Mogc09nRO6RQpEmBe1dEANBs+M2IiKtQxVnU1KARXg==");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Employee logout failed");
			reply.header("x-auth-sign", "Qvpso3NvxNY/wF24i7sA6AvS8ca/qPwdIOj4RpPPQUBEOpniIRt5v30u1lVq8DTAC+mvD7hAHIpmr91zBM5LFw==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});
