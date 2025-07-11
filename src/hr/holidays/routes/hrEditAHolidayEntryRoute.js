import fp from "fastify-plugin";
import { hrEditAHolidayEntry } from "../methods/hrEditAHolidayEntry.js";
import { hrEditAHolidayEntrySchema } from "../schemas/hrEditAHolidayEntrySchema.js";

export default fp(async function hrEditHolidayRoute(fastify) {
	fastify.patch("/hr/holidays/edit", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "a23c0712dafef268d4d682c181df86e0 ||| 1bb0d87393730869e6cc03700d6ec11e57136bd6fdce91a7f9e90a54e4777e395d1723196ca9cd808e12de4602793fc8");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrEditAHolidayEntrySchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "6d18c6d6fe0b8894b6a44cd53c5d0556 ||| d370a6f250f305707c74c6ef64139b76d2503dff0678d1ead4fe0f9170dadffadfc334f6ccd62c8bf46184516b9c9961");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrEditAHolidayEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "8f6c551bbc4561ec86f67f67663d1e24 ||| 500d4b6727d0e847c09888c226591680b0ded0e36117ffd674e44553b6b97168efc8eabaf8b2b96616547fad1782db1d");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				updatedFields: result.updatedFields,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to edit holiday entry");
			reply.header("x-auth-sign", "9d011354bef423f013335ba8448dcf7b ||| 353a70737085c2c6e023e703df6c57edba09af7bf95eee3728679f102ef6a5e5aa38cafdd946d041592c0deface0f715");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Failed to edit holiday",
			});
		}
	});
});
