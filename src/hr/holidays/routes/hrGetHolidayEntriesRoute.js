import fp from "fastify-plugin";
import { hrGetHolidayEntries } from "../methods/hrGetHolidayEntries.js";
import { hrGetHolidayEntriesSchema } from "../schemas/hrGetHolidayEntriesSchema.js";

export default fp(async function hrGetHolidayEntriesRoute(fastify) {
	fastify.post("/hr/holidays/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "Lw7MUObt8ewrm2cpx4AlJ8FJHu7vP7/enXFbnfsvMKKYcBmYP101BExyHGQC3mAyl1TkTdB0XYK61OXSyYI2Qw==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetHolidayEntriesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "nPgjijzu6UPeuq/qP3d7dLj2USUqgeXY7ZglZOBXyZDLqh7GFvMtCBH4vzOulqD6ZOafcd/2L8j+ylfiQVyg1Q==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const holidays = await hrGetHolidayEntries({
				authHeader,
				...parsed.data,
			});

			reply.header("x-auth-sign", "NW0zH8QSfRNO+kQs4VlUEr5tQY6pFLXf0Y8XR0AfZr5gR6LnZh1hTH79EjGZhgxubHx2DHofuzi4al21MrvEPQ==");
			return reply.code(200).send({
				status: "success",
				data: holidays,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch holidays");
			reply.header("x-auth-sign", "rbMxrb+Z4s5ftP8uKV1R+/DI23Ok/jzKtfhBJFmE+NVVXWBZS/t470lTUTBlEBLQUiW1PymWn2xWru6h0zY3zw==");
			return reply.code(500).send({
				status: "error",
				message: "Failed to fetch holiday entries",
				detail: error.message,
			});
		}
	});
});
