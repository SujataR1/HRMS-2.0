import fp from "fastify-plugin";
import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "8ddd4b464eee7a887fe6293655531cbd ||| 3571d9a8bade561084f96d354f776eafbc4105ae7b86918e5ae90198368ecffeff6e2db919e594c4b39c62e4b4cdea4d");
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
				reply.header("x-auth-sign", "31d0c3729a8707c8e64fe4a63960307b ||| ef0a8f35d6d319825e51c43e558432ed8db73b83e780df92610645d628af3c50e808e0ac2f4b459f914c95b08f69df6b");
				return reply.code(400).send({
					status: "error",
					message: "Missing leaveId field",
				});
			}

			if (files.length === 0) {
				reply.header("x-auth-sign", "34a45da3b4389d54118ca1ef9ec27fef ||| 5cd6212606bd566dffd61fe84c74ed7888fd86c14152b723471a971803c3c4694e5c4c6395498a56485674b8891ab8f4");
				return reply.code(400).send({
					status: "error",
					message: "No files uploaded",
				});
			}

			const result = await employeeUploadLeaveAttachments(authHeader, {
				leaveId,
				files,
			});

			reply.header("x-auth-sign", "53ebdb2a07f36a27c9865e1562c8d0f3 ||| 7dad05ee8772a89b94eff0361449640a16f2774b10bc15b21f29d89796dc1cfc9c59f22108338fcfa51422c2e7c46a4a");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				paths: result.paths,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
			reply.header("x-auth-sign", "7606ed3002df01090ef83c46859e78d9 ||| 86dbe8bf5fc83bd7e5bef239590f4b8425bb26dfe74380c4fe96ed03f90358d26b989c8802cd3eb3678570b2285ee2d7");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not upload attachments",
			});
		}
	});
});
