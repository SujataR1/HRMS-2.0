import fp from "fastify-plugin";
import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "TQCTCShjE5PD3Zt3WXkhKUu+N8KCqJnV5lUPvlg7MMOffuB2kXG84COJ6KzubU+2A9Etp/1ypUvW7FSdPwUhmA==");
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
				reply.header("x-auth-sign", "vk6vwnndZReStn7OlZl661m6eZFU1yWLWpZrcIbRNter8ykDPyMpsatyN1yV72/4DI8/P+fhsQZ83KWDlEKvOQ==");
				return reply.code(400).send({
					status: "error",
					message: "Missing leaveId field",
				});
			}

			if (files.length === 0) {
				reply.header("x-auth-sign", "4lBXdcuuve4VwING3ZguqO34oQeK6e4epwQ+DPV6SqgVIO+PgkwSbkSQbhlXQYooUcMJWk5h2f5wucW6DUHh3A==");
				return reply.code(400).send({
					status: "error",
					message: "No files uploaded",
				});
			}

			const result = await employeeUploadLeaveAttachments(authHeader, {
				leaveId,
				files,
			});

			reply.header("x-auth-sign", "9ardQSiZnmrqwQ86Ugw3jXZ64LhVUlhHxVtV526xO48hhuecMVu9IEEKEuoRC0HFn7ONiB4IPHqTGO6tude3qw==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				paths: result.paths,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
			reply.header("x-auth-sign", "MexU/2TbZvZhfN0nyo58gP+8rw0uRyLS24fekiBmfnAssxIPbBrgIcSNj6/LUzhViDhLffa4zRmjKgtgHA0aHA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not upload attachments",
			});
		}
	});
});
