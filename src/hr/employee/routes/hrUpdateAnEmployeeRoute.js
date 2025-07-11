import { hrUpdateAnEmployeeSchema } from "../schemas/hrUpdateAnEmployeeSchema.js";
import { hrUpdateAnEmployee } from "../../employee/methods/hrUpdateAnEmployee.js";

export default async function hrUpdateAnEmployeeRoute(fastify) {
	fastify.patch("/hr/update-employee", async (request, reply) => {
		const parsed = hrUpdateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "0255fd1f494a1cd49e1469b9937b4e1b ||| 667c49e27c1181d4eda76b2fa72a85fee9ad6eeefb2c255aebfd0bb88022bec165fb8a0ca4dada85903ff13083cf13c4");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updatedEmployee = await hrUpdateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "8afdbd708f523a5e962ceaacec0b5782 ||| 1f6a1434f3b95576bfca3a33e9531c80dc58e11c0599c7dea5e09132a02fb1b5557325f2d6322744368771b6abb1c085");
			return reply.code(200).send({
				status: "success",
				data: updatedEmployee,
			});
		} catch (err) {
			reply.header("x-auth-sign", "9bb28e692a4cdde6ee78ee51b3058d58 ||| 0fd326f60615645f8eb64f1db6b052b4d7a0e0f29e8271c94aee69a791d53147f5aa0c3b32d0fc8e8ed0d4964d2f8edf");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee",
			});
		}
	});
}
