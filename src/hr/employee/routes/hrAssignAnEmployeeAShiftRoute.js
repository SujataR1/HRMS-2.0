import { hrAssignAnEmployeeAShiftSchema } from "../schemas/hrAssignAnEmployeeAShiftSchema.js";
import { hrAssignAnEmployeeAShift } from "../../employee/methods/hrAssignAnEmployeeAShift.js";

export default async function hrAssignAnEmployeeAShiftRoute(fastify) {
	fastify.patch("/hr/assign-shift", async (request, reply) => {
		const parsed = hrAssignAnEmployeeAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "2bd376d52e6568eef6c9291101feb813 ||| 3ba74293a29694a554434088d1969d6ec541ff3f181ba97b9feda6b08728c54679f54dd27d177c882e6a181fededdbab");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrAssignAnEmployeeAShift(parsed.data);
			reply.header("x-auth-sign", "f90baf7a9d46813e27d9e890dc091547 ||| ac21a5aa122f309a3b865c168ba241f67457c9fdc43e8a34c5e64446003e3dc4c0af6137153d8376490c9920c4b3688f");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "b26a8557c044d55ee9801441f3736a18 ||| c6f59eb771a378475a5bcdd6fd39211497941a40665b73049e1e75cd8055427a19b345e03e3d5fcb109bb2b19a111f77");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to assign shift",
			});
		}
	});
}
