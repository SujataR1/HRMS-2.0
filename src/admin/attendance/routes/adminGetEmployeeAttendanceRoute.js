import fp from "fastify-plugin";
import { adminGetEmployeeAttendance } from "../methods/adminGetEmployeeAttendance.js";
import { AdminGetEmployeeAttendanceSchema } from "../schemas/adminGetEmployeeAttendanceSchema.js";

export default fp(async function adminGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/admin/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "jlNLypMWC/2OLXRn2wtDYdto/Ufcs1qGNmxVXzXSfp7D8rqw0WdzxBW6AygUriyZJsdS9nnhjEeWtXntj8t0bw==");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = AdminGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "MlqX5IYO84JiNLs5r/FH4Z8ZcPhMWCv27yY156tVI+WryabymFwiS9SWT9Qfpf5C3llCki/3aANB6kHmU8Qz9w==");
			return reply.code(400).send({
				success: false,
				error: "Invalid input",
				details: parsed.error.flatten(),
			});
		}

		try {
			const data = await adminGetEmployeeAttendance({
				authHeader,
				...parsed.data,
			});
			reply.header("x-auth-sign", "7wYDHmYDhbbepxh3HhaelFgRtzwLpF4hQPYe/4tt8iIefSpS2HV2vN/I2DxCkWoVGaf1nkw3sNQXeceKkoUhPQ==");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in adminGetAttendanceLogs");
			reply.header("x-auth-sign", "ycubIN0De4EdFDZeVusVDzBy+JDTsq4OPhs91SmJUFqVIe3FrPLKOYtwTE/wtLDMod3kiujFGYiKXIdVfejcOA==");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});
