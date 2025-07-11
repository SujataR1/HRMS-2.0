import fp from "fastify-plugin";
import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "aKAwRWdfho25li6Ha1fEkF2VcMg8GeBVNeKzJQbftlvERemTvi+dDOC2Ir7VoOZbvP2e1siZ6oCWu+J7KHilmg==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		try {
			const parts = request.parts();
			let leaveId = null;
			const files = [];

			for await (const part of parts) {
				if (part.type === "file") {
					files.push(part);
				} else if (part.type === "field" && part.fieldname === "leaveId") {
					leaveId = part.value;
				}
			}

			if (!leaveId) {
				reply.header("x-auth-sign", "WVrUT4MPaq+RmDxaESPzx8CMilml5Oxc6RWmPzABjzNQNtLDfsOoXEVyudyOe7TfOlDCXu1ZkzAULqRW9xDDtg==");
				return reply.code(400).send({
					status: "error",
					message: "Missing leaveId field",
				});
			}

			if (files.length === 0) {
				reply.header("x-auth-sign", "tNp1Xywgx5tlFPaH42JazhE66HEad6kpWYvY06QQwsecgIbjRPN3lJ0C2NqUfvTJ9crMUEm8CZiL7nLP6gWmoQ==");
				return reply.code(400).send({
					status: "error",
					message: "No files uploaded",
				});
			}

			const result = await employeeUploadLeaveAttachments(authHeader, {
				leaveId,
				files,
			});

			reply.header("x-auth-sign", "16Z4JNKmu4SEgifpn1YpTZUDcgtjlkwYXpZgs/Chg7IJ2SXCPzaHmuouaqTJ5ugp7Or8xTrW7p1viij66aplUQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				paths: result.paths,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
			reply.header("x-auth-sign", "mGAOGNoDsELfDTtmr67qoT/4EqkGoqjv2PdMSLxKWlQwN+xbM88GQkbxqeL8S9Iw4XKZMmi+0M+0lUP97IaGMg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not upload attachments",
			});
		}
	});
});
