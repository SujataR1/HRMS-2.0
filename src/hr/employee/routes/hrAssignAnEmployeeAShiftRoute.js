import { hrAssignAnEmployeeAShiftSchema } from "../schemas/hrAssignAnEmployeeAShiftSchema.js";
import { hrAssignAnEmployeeAShift } from "../../employee/methods/hrAssignAnEmployeeAShift.js";

export default async function hrAssignAnEmployeeAShiftRoute(fastify) {
	fastify.patch("/hr/assign-shift", async (request, reply) => {
		const parsed = hrAssignAnEmployeeAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "9OXPTU9OuFRZ9AEkOcFJEAnMa8P9eDM0zJJPFXJiQax0ZnOoSbrqFfqsR6jKyEX87ckBZiA5SKtwuJcYT926LQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrAssignAnEmployeeAShift(parsed.data);
			reply.header("x-auth-sign", "ce7+du/GVnY+tTqYAp8/pWUiGqufbAnNrh/Ur8VDsosOCBRESxZ0TXM1PjmP6VpNh7cmfhE6tSgjxGAncEasAw==");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "coTfHiZ+MTkeKa+KcypGIE5KqE6LuaIxhbl5oWUqydqPs/5jEi7XuqRNVSnS42G//68lNImRjHqGXepKRHPo4g==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to assign shift",
			});
		}
	});
}
