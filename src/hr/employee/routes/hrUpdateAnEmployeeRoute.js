import { hrUpdateAnEmployeeSchema } from "../schemas/hrUpdateAnEmployeeSchema.js";
import { hrUpdateAnEmployee } from "../../employee/methods/hrUpdateAnEmployee.js";

export default async function hrUpdateAnEmployeeRoute(fastify) {
	fastify.patch("/hr/update-employee", async (request, reply) => {
		const parsed = hrUpdateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "OVBhD56eYtYyBZTHpfYyEuP7At4kxvxcCsqKZkHJfy+sb1UVXvMftAOSYj7F9/fadwwDQ8KE55YHc8PaMkeyvQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updatedEmployee = await hrUpdateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "CD6EeFhJVfEYFxI09Y8Tm7ZcHa6xq/yIJL627nrUmX6IuD0M4GYA+u9vZPoJU6uPXTsn8TGLkio9uglGC3fRVg==");
			return reply.code(200).send({
				status: "success",
				data: updatedEmployee,
			});
		} catch (err) {
			reply.header("x-auth-sign", "rZMdGcYgnYnCGiOMYORggiXKtjEWRS0rY4uyfTrar5UO8CsY4wgG5XtuObf4dvyHQhPue6GSZbNk8ieh1lWn/Q==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee",
			});
		}
	});
}
