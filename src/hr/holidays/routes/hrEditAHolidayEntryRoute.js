import fp from "fastify-plugin";
import { hrEditAHolidayEntry } from "../methods/hrEditAHolidayEntry.js";
import { hrEditAHolidayEntrySchema } from "../schemas/hrEditAHolidayEntrySchema.js";

export default fp(async function hrEditHolidayRoute(fastify) {
	fastify.patch("/hr/holidays/edit", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "8my8fb9lC7gUzehV3Z/Q+HBuUqTDiIhQzBhoy3X9hgvRhCZdaGup2iLxl54vjBfdDANkjRXb0fKCzQUz7Ubhrg==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrEditAHolidayEntrySchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "kYba3b0m8ptGrQB9P+SB+hFhMCdDiT+UYGcTjeL7vWoI0J4MSTF+BTrB9k6LUPUGNjo+bhcs2/Nt/CtWBDu/CA==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrEditAHolidayEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "zlcfivvp1CtuTfoBmo1jCDKgtuk0DaMtHPpQwqHOoVAHkKAWF/LqCvaFK6UgV3Huo3l99Vcfu2XXoMPvW4+Xqg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				updatedFields: result.updatedFields,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to edit holiday entry");
			reply.header("x-auth-sign", "KDXnSVIcPf7wzzWcskvKAS+zWgzKSg//8NfAtHsirfqmlUcxRWSk4Yvo8X+Z/WvYmWrNDSwNAaLq31/ki7RPPQ==");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Failed to edit holiday",
			});
		}
	});
});
