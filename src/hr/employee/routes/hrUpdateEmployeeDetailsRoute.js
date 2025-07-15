import { hrUpdateEmployeeDetailsSchema } from "../schemas/hrUpdateEmployeeDetailsSchema.js";
import { hrUpdateEmployeeDetails } from "../../employee/methods/hrUpdateEmployeeDetails.js";

export default async function hrUpdateEmployeeDetailsRoute(fastify) {
	fastify.patch("/hr/update-employee-details", async (request, reply) => {
		const parsed = hrUpdateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "4ce489018af6426d233065f06623b441 ||| a66cedce03d055ff77c968a76e6dba8f5622141b3e21d5346bc205ccfb02bee18b082f0d2dd58548c252cf94b780f29b");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrUpdateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "7e714798cb6678cca2648808639ae457 ||| bbc647a883d93ecc68997afd3571e3b3e6e35e0f58ecd0c361eb2a4bee6c2cc077aa66f9289aa4730693ef2ea0cbb176");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "a3290246ca6d1c236905a3b5088b7b6c ||| 56891c7b83a6000b00c79774ae4d124f2c21f6aa2adafd426ffec95d7f1e58270cb81e0342b58e03cde866a3b34eb2c4");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee details",
			});
		}
	});
}
