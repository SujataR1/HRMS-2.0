import fp from "fastify-plugin";
import { hrEditAnAttendanceEntry } from "../methods/hrEditAnAttendanceEntry.js";
import { hrEditAnAttendanceEntrySchema } from "../schemas/hrEditAnAttendanceEntrySchema.js";

export default fp(async function hrEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/hr/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrEditAnAttendanceEntrySchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "i6vtOvEHh6ew7iox5iIHdYxnw1/Xi86KAEHlhFu22CYC5/1iMXTWjncyP+aC+RsBz5q3IvDyKIQO8TGpOgzDQA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrEditAnAttendanceEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "NUTXFrQCySWR29ANtE04mH7gnWmzobfik8zhjzEfs0NEKI+3b4YEqgm0bBYIRrwuxv7iUXbsOg/A7hMFjRWYlA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry (HR)"
			);
			reply.header("x-auth-sign", "v2PvgLS4H5gw7oNvboMFykEabK7AE/A52CrOhMjCCKPGstNkPPe+FBpzhlmRhp2r+QgZnzm2cCgpeGeVRBo/lg==");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});
