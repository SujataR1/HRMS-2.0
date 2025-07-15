import fp from "fastify-plugin";
import { employeeCreateLeave } from "../methods/employeeCreateLeave.js";
import { employeeCreateLeaveSchema } from "../schemas/employeeCreateLeaveSchema.js";

export default fp(async function employeeCreateLeaveRoute(fastify) {
	fastify.post("/employee/leave/apply", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "04766f71fb24914887f2b979e2713a54 ||| 2fefc8cb96a54fc7e7f19515f37e8caa0e24ba8c9dc451fdbc210d7e83a77d71e8691f25dfc1a4eb6992c3eed7b5d5d8");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCreateLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "11786109ffab23d72ac0d352721fc015 ||| 233ce1074bbe1a08bb2793fd3118f22bb56efcf30d9fe4bd6f2d9792eb97f9de90ee8a91248be5a13dc00bdf3599cf85");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCreateLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "cc6e7e5b5d80a92fad491f406a0d2785 ||| 61447779808543d65f6b155b4f6fd9522684a1f5eeeb77fac2645eaac07a3e7ee5382831bd82c9e124a1dbd7615500dd");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				leaveId: result.leaveId,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to apply for leave");
			reply.header("x-auth-sign", "5a4e0a348d93f2f0b55955c7dc288b46 ||| 5d63522f8d71d96980aad29c2f85a789ac4b4b1d62977e2930ecefb9791774b059a101384ec58cb07d8d27a949e3e509");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not apply for leave",
			});
		}
	});
});
