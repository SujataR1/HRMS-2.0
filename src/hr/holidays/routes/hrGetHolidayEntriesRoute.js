import fp from "fastify-plugin";
import { hrGetHolidayEntries } from "../methods/hrGetHolidayEntries.js";
import { hrGetHolidayEntriesSchema } from "../schemas/hrGetHolidayEntriesSchema.js";

export default fp(async function hrGetHolidayEntriesRoute(fastify) {
	fastify.post("/hr/holidays/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "70d007738f97320ccb006fe10d7ee12d ||| 486069d39c675ba4d55cfc9b77b58f0df2d4cebed3449d425e1a2395027ffd4378c8725cb66ceca102a79084daffa1d9");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetHolidayEntriesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "85a178d1ec75a0149aff0192f6988e6c ||| 6c8b502b34139250f16bd6ffb042bd9c71557eca940894ec831e19508ef61a9a9b2975f76093aaaa89b76c1676018c83");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const holidays = await hrGetHolidayEntries({
				authHeader,
				...parsed.data,
			});

			reply.header("x-auth-sign", "97a1e51f036d2feb10bb5e962c4641fb ||| f218328097b4e23487e47ac24137e82df9d60a130dcd5b668f2bd30c28a1f36bcafd84dd9b70a71b13fdc3a078f579d6");
			return reply.code(200).send({
				status: "success",
				data: holidays,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch holidays");
			reply.header("x-auth-sign", "79589e86eddda8b473bf81db8dc8a99e ||| 9646332c7d36418b6814d1f23f71e50f3e91364cf28a8a57e0dfe4a222e1f4422a0c5b0aa055e3d672319473ab410282");
			return reply.code(500).send({
				status: "error",
				message: "Failed to fetch holiday entries",
				detail: error.message,
			});
		}
	});
});
