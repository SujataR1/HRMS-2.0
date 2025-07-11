import { employeeLogin } from "../methods/employeeLogin.js";
import { employeeLoginSchema } from "../schemas/employeeLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeLoginRoute(fastify) {
	fastify.post("/employee/login", async (request, reply) => {
		try {
			const parsed = employeeLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "f2746abeebfe8f96ecb707764eb0839e ||| 1e74731ea0a701ec100ee37cdff4cd8773efd0bae7f50a62c782ede3becf6570990efec586527c1251e4756deb83fcf4");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password } = parsed.data;

			const result = await employeeLogin({assignedEmail, password});

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "71e0d3d56872480d80dfd8ba63f358af ||| c46782f9b5f09e7e81be78272a98985cdd71de01da6c26d4099069b0fb0a1958e319c591cefa2f619908632d341231a7");
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
				authorization: `Bearer ${result.token}`
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to login employee"
			);
			reply.header("x-auth-sign", "4d6a85e51d43898626167cb4dc0406b9 ||| cf4f23fc15cba0bc4ce701f3a988ad74604b01490acdb99272e1360bfee5402e4b98e9acb515956155943cd62435e54e");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Login failed",
			});
		}
	});
});
