import { hrCreateAnEmployee } from "../methods/hrCreateAnEmployee.js";
import { hrCreateAnEmployeeSchema } from "../schemas/hrCreateAnEmployeeSchema.js";

export default async function hrCreateAnEmployeeRoute(fastify) {
	fastify.post("/hr/employees/create", async (request, reply) => {
		const parsed = hrCreateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "8X7ceJCv6G8UTbyeBWq/7UmtLPmIkWtbMVLceQD2Ofs+ZJWq7+T3US9JwV4ArGGONJJ/PY+Lyj20FRXiRPWqMA==");
			return reply.code(400).send({
				error: "Validation failed",
				details: parsed.error.flatten(),
			});
		}

		try {
			const newEmployee = await hrCreateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "RH4gTaZFdmEDreQ0Fg2zevwm76WV17K0vUrbm9WAayvRi5kk70y4DUyRy9fs+nf78RZnI0NdvwVv2D1Li7z5oA==");
			return reply.code(201).send({
				message: "Employee created successfully",
				employee: {
					id: newEmployee.id,
					name: newEmployee.name,
					employeeId: newEmployee.employeeId,
					assignedEmail: newEmployee.assignedEmail,
				},
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to create employee");
			reply.header("x-auth-sign", "7UWv2AENZ7ZwOk0P1FusO2+oawSInbHfBv5YAKSI4xtCJq41uJwgi/w7CHDLEwiVie4AUuVoQSa8e7lOvr77NA==");
			return reply.code(500).send({
				error: err.message || "Internal Server Error",
			});
		}
	});
}
