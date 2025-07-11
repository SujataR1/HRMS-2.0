import fp from "fastify-plugin";
import { hrEditAHolidayEntry } from "../methods/hrEditAHolidayEntry.js";
import { hrEditAHolidayEntrySchema } from "../schemas/hrEditAHolidayEntrySchema.js";

export default fp(async function hrEditHolidayRoute(fastify) {
	fastify.patch("/hr/holidays/edit", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "3c9a5783d3a6e0003fa3e78e8fde99ef ||| eb85ccf63f7105bb2985e7e15eefd59310ddf79e5d036d60af47640955b902d1e9c7335d22d8f881b6990c03975d8db5");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrEditAHolidayEntrySchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "e4f1bda459729dde5625b1bc6756416b ||| c962fd365341bc379395f891a02290fdac0a9d43efa63071cdfdc5f2cb9c8d6de812eec70aefc41e6178d2d9e89fea94");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrEditAHolidayEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "6a0097b352b7094db7586ca41d3944e2 ||| 50b152d9c7cd6902c068a6d93cb81cda1e02a6506912c4c75abf7ef79b795cb7c9b2b94763c22ea54bc8ec97f1d80a67");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				updatedFields: result.updatedFields,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to edit holiday entry");
			reply.header("x-auth-sign", "487b8a2f8391189b229002131d1c9c7e ||| 89a7e0829889d4b6406d76db5c9de7d7f5b7d5a081944a10994cd4812ceea3b40734cadccdb8c660f58f260f436faa51");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Failed to edit holiday",
			});
		}
	});
});
