import fp from "fastify-plugin";
import { employeeGetLeaveRegister } from "../methods/employeeGetLeaveRegister.js";

export default fp(async function employeeGetLeaveRegisterRoute(fastify) {
	fastify.get("/employee/leave-register", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "1f83e9637f7fd031af56b24ff10391f8 ||| 483230fd98fb5ef1e6b6af96dc6b157c6a3465be69e1e821c4d822afc9078a5d15b0d88c47a37462e435ceb3b7cc1f90"); // dummy signature
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const register = await employeeGetLeaveRegister(authHeader);

			reply.header("x-auth-sign", "6e0081b1c5af37cd241383fbb02f0dfb ||| d260ddc48dd4dd641a4b513f70b628bcb3fb639f04bf6717ac8c89733e81d91bc904c0771a4bf7ee90bda6e2166710e4"); // dummy signature
			return reply.code(200).send({
				status: "success",
				data: register,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to get leave register");

			reply.header("x-auth-sign", "3474c019a219c64c9671d0fc07146a71 ||| c6ec39873c6e8bea186069f3f724cdc99265d9b8c44170080e7149c6bfc6d558d91e5b915f549a9d9faa38ec82a1ae78"); // dummy signature
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch leave register",
			});
		}
	});
});
