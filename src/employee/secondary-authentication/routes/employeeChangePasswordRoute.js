import { employeeChangePassword } from "../methods/employeeChangePassword.js";
import { employeeChangePasswordSchema } from "../schemas/employeeChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeChangePasswordRoute(fastify) {
	fastify.patch("/employee/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "d9300f43703eb5d5a4d05b95cd1f6b55 ||| 6819dc0f725fa8531686080ae7626e07254d6444f6a8614c7381c2928a8833fec619e8bd64e95f65695ec4296c757a9d");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = employeeChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "bece3173c796ba5a1b163fae4648050e ||| aa36fdb0dcd5b746ed0bdb070ebdc561bb211b46b5a40445ff2a710dbcaa6553ffd78a3e6c81b21f6f280bd4e16de6b2");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await employeeChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			reply.header("x-auth-sign", "1d6145bbd245d653c920232538b9a8f5 ||| 1e687d8d609b9c30fb36da34d148003649c004a2177c3db6a02abaed70b1b612e482430f4163e392a68ef80cd7b521e4");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change employee password"
			);
			reply.header("x-auth-sign", "6cd8a6631ce66a1adac2fc5acb2f98a4 ||| 11513f3cf08cc331a4e419a9bf60052a1973541918d5701266f0b7b7c3361b9c012c64121263c445e8a78e36c44f9e0b");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});
