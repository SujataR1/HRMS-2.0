import { hrUpdateAnEmployeeSchema } from "../schemas/hrUpdateAnEmployeeSchema.js";
import { hrUpdateAnEmployee } from "../../employee/methods/hrUpdateAnEmployee.js";

export default async function hrUpdateAnEmployeeRoute(fastify) {
	fastify.patch("/hr/update-employee", async (request, reply) => {
		const parsed = hrUpdateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "f96cabb34a7a76917c91640aa5adc553 ||| 33e53bb29309bf2a39a711b00f59480a5af4749c16f3efe1f4fcff5f91c1207be1e607ce18299f94e46d2e85f88da4de");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updatedEmployee = await hrUpdateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "b74e47d154cd114fa822a8281ae21c57 ||| 3f55c2e2b295b19f8704307164ce7bfed3a75cfb5b424ac92e374abc6bc7504a07378ba64f7d9d229c49fc9e56308837");
			return reply.code(200).send({
				status: "success",
				data: updatedEmployee,
			});
		} catch (err) {
			reply.header("x-auth-sign", "bff9459345c737f9daebdab06729c236 ||| 51a10e19af079626eb45a4f4c31ae5a0b2d6b2ce30aae5bae795b87506a9f4e391f9948840cffb3fce6cdf4b12ddf9ad");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee",
			});
		}
	});
}
