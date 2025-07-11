import { hrAssignAnEmployeeAShiftSchema } from "../schemas/hrAssignAnEmployeeAShiftSchema.js";
import { hrAssignAnEmployeeAShift } from "../../employee/methods/hrAssignAnEmployeeAShift.js";

export default async function hrAssignAnEmployeeAShiftRoute(fastify) {
	fastify.patch("/hr/assign-shift", async (request, reply) => {
		const parsed = hrAssignAnEmployeeAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "26e638a9d41fe6147c30b8a8c803db3f ||| 5c4b915df7d7686c0b06b08299e5bf010b918e7f978417525dd236493733dd85b0282309924b0f91d98713215ff0755a");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrAssignAnEmployeeAShift(parsed.data);
			reply.header("x-auth-sign", "32b2ee78e524560a943914bbd6a0ee9c ||| e200c86e079c7d135ba366d74984270cb470529711a67c1b082a1f3d1e1e8e42a3f8fafd04bdacb8372857b81c8d913b");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "8affd49fb16d5c3dcd2e6a0194ebdeba ||| cf649bb845ea8c034925d31e3667e4cd7bf98ae36eef992cd412b4fd0c9bccb11e8dc4da65a1a740195a2883afd664ca");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to assign shift",
			});
		}
	});
}
