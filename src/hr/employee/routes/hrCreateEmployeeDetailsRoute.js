import { hrCreateEmployeeDetailsSchema } from "../schemas/hrCreateEmployeeDetailsSchema.js";
import { hrCreateEmployeeDetails } from "../../employee/methods/hrCreateEmployeeDetails.js";

export default async function hrCreateEmployeeDetailsRoute(fastify) {
	fastify.post("/hr/create-employee-details", async (request, reply) => {
		const parsed = hrCreateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "584b67bcea67ef3ad260c8202ff6078d ||| e600bf1f751eb598241a239e41be20f6a5dfb32a92289af12c9fae64bfc5ef5072d1bd91703037ffa8ad14e1329d6329");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const createdDetails = await hrCreateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "92f81058cd3c7152d88ddd607d1e5442 ||| 1b980890a7cd36d1c2ec78996f57a741933dd41c6bb5047baa129d3dc2f5707e4a32b3fa0db175dbdfd20ee3e831698a");
			return reply.code(201).send({
				status: "success",
				data: createdDetails,
			});
		} catch (err) {
			reply.header("x-auth-sign", "8d0695757d89b94d781c59fee27ffbea ||| 500f280d8bc567a52db8c16dd2738865c0262403e7fc8de1356be3e51e71946cf4a241d70fa154a84b4b92e70a12b967");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to create employee details",
			});
		}
	});
}
