import fp from "fastify-plugin";
import { employeeCancelLeave } from "../methods/employeeCancelLeave.js";
import { employeeCancelLeaveSchema } from "../schemas/employeeCancelLeaveSchema.js";

export default fp(async function employeeCancelLeaveRoute(fastify) {
	fastify.post("/employee/leave/cancel", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "600677a3eff4a8be683be053f9e88f44 ||| 0fe51b22ecc5179570a391e981380534bbcc0eb31689415fbe1e6b16eda96f0e0775a793fd6432b4d6b7b0eb3c3a6bcf");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCancelLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "b8fcc9749b3942d41f2f06f312e98b38 ||| 878f1b99ef2b452c06275c61c6aa235a0b969d42234baa107cc63e8c951c8d4d991f74a40d08e7648261522361cc06a5");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCancelLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "2bf68e66407df374d4d4d7de14abc64a ||| 60c93b0549ec1e2616c5dc8c393c8f3b40ccb715ad7ebc1b6ff3b4443f47c332accf89a6bf1c5afa08ec12a490efcd8e");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to cancel leave");
			reply.header("x-auth-sign", "785a2312dc28150b5c4ef245b1a5d8a2 ||| 26200c57dc3df6cb3a449472d34d977957d4d5b30dfba290fccb00de0c9d10ae7ab67ab17ab97ff1176953f1479c5222");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not cancel leave",
			});
		}
	});
});
