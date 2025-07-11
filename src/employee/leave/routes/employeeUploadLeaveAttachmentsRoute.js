import fp from "fastify-plugin";
import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					message: "Missing leaveId field",
				});
			}

			if (files.length === 0) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					message: "No files uploaded",
				});
			}

			const result = await employeeUploadLeaveAttachments(authHeader, {
				leaveId,
				files,
			});

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: result.message,
				paths: result.paths,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not upload attachments",
			});
		}
	});
});
