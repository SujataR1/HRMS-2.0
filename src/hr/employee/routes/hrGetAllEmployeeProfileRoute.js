import { getAllEmployeeProfile } from "../methods/hrGetAllEmployeeProfile.js";

export default async function hrGetAllEmployeeProfileRoute(fastify) {
	fastify.get("/hr/employees", async (request, reply) => {
		try {
			const employees = await getAllEmployeeProfile();
			reply.header("x-auth-sign", "0eRTmvlYEcbKU1Rwnkrfd+LtjnzrG+6E0Evz4q2rKRTJTqjGVXlvYz+oJdB1PtJwes219jdBwhctqBuuUZEn0g==");
			return reply.code(200).send({
				status: "success",
				data: employees,
			});
		} catch (err) {
			reply.header("x-auth-sign", "hDGHFk3XDPY6dy41OK9ManeLD4hUagcD7xAwwCyn5N0np8y98MBUTGLbclpB6xmCrzjC5TbaSZsVomfDjkXwAQ==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee profiles",
			});
		}
	});
}
