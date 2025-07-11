import { employeeChangePassword } from "../methods/employeeChangePassword.js";
import { employeeChangePasswordSchema } from "../schemas/employeeChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeChangePasswordRoute(fastify) {
	fastify.patch("/employee/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "d59c552a610b6d7b3241fa8e1ca5e4a1 ||| c36906f81c6aa03ed95b111e016296f6a34e5989aacca3eac1c863476af32e62f286a294d5787022d88a56d7c5d72607");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = employeeChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "b0bb0f934271c70035f786a0c7838a7e ||| 2b307bcff3a2ae85e6c04948c8c65f237a5a6bc999bebe6202e86510bb822f2c12b0111886c5542559e10318209cb910");
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

			reply.header("x-auth-sign", "8c060cd61c242b07a6d2f3892040b3c7 ||| d0b514c549d5fc40813724262b29ed38d4fe6a9c2df18c4d41983ba20c939e233138dbe23e1309645c036b5f486d55b1");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change employee password"
			);
			reply.header("x-auth-sign", "e596ad4da256851057a7b686c0f21b7a ||| 78a84cd0db42581ea12151e45b75b3e6725264cad03ba82143e767230efe633d6ee8c42b69a51331f5257f7e5cf50d48");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});
