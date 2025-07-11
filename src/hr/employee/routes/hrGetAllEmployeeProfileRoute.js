import { getAllEmployeeProfile } from "../methods/hrGetAllEmployeeProfile.js";

export default async function hrGetAllEmployeeProfileRoute(fastify) {
	fastify.get("/hr/employees", async (request, reply) => {
		try {
			const employees = await getAllEmployeeProfile();
			reply.header("x-auth-sign", "5f719a691e3864f6264925e7d457d17c ||| dd65014193f09b9f880880ccc0b62b42c439ddfc8a14f8e32aa9d473912951dfa3eef4e7ba6c9e04dc930f0b57a81271");
			return reply.code(200).send({
				status: "success",
				data: employees,
			});
		} catch (err) {
			reply.header("x-auth-sign", "0a8fbc2f9f16a926b7a53998782c3488 ||| c9bd73e9fe012e84036d9a8a6ee931812f95c9e953c751d1e9612ea6213854ba5d744016b57b1ad23c921587f47c5506");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee profiles",
			});
		}
	});
}
