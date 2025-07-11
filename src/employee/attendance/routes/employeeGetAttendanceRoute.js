import fp from "fastify-plugin";
import { employeeGetAttendance } from "../methods/employeeGetAttendance.js";
import { employeeGetAttendanceSchema } from "../schemas/employeeGetAttendanceSchema.js";

export default fp(async function employeeGetAttendanceRoute(fastify) {
	fastify.post("/employee/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "sje8lBowmYQ2E2ZMtX5kGQpZ4Va6C/5GGu1kjvgUS1WtS1woiwkVjdo0bMv8YaHkCOuCi45440E/ISf+5OsGzw==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "15xiXe9PdcrnwnNs4ZVFBCVGrDyQ0CspY5cR45XHOYe7xyAL0fJVympb/SQ5FQMnP3PUuVQdQFRbw9R6lGzthg==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const data = await employeeGetAttendance({
				authHeader,
				...parsed.data,
			});

			reply.header("x-auth-sign", "zvLCvBjT58FWGBsgmsIOtoMiUq0cfBiClKqu0bcEijbYlQcXO/XcCj8/jpunkeNhhTHeKB321ZGhXxqvi1YqGw==");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch employee attendance");
			reply.header("x-auth-sign", "Fl17WQC0U6wLQgGwPuqx41a710zwUpHQbKNlflqlno46xQzZrde3/J2m3XDu6Q3o5pn0FEQDeOywqte88ecrqw==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to fetch attendance records",
			});
		}
	});
});
