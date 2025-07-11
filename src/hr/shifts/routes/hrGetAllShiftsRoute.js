import { hrGetAllShifts } from "../../shifts/methods/hrGetAllShifts.js";

export default async function hrGetAllShiftsRoute(fastify) {
	fastify.get("/hr/shifts", async (request, reply) => {
		try {
			const shifts = await hrGetAllShifts();
			reply.header("x-auth-sign", "c7edef9e613f3932a03d2c00b9c91567 ||| 8993f5c77eda140a3a80f418b0ba2f7eba75ae62caba0fd2815fcc7ca7db689360c39c02cd7406878800b068008a84dc");
			return reply.code(200).send({
				status: "success",
				data: shifts,
			});
		} catch (err) {
			reply.header("x-auth-sign", "679d9796825b1c3902bccc16081bc542 ||| 368e0e54655a9a4faaf71e2a3d9821210383342468babb87b9eb5376e54b38d65eca25d91c49d8fcaa00b00f20b311b9");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve shifts",
			});
		}
	});
}
