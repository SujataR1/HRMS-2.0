import fp from "fastify-plugin";
import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "2992c6bd5e87a87174c06f83d73962e8 ||| 4b978d0a373c362cc07e6bf2198b5ff8d1c2d28bcca95c51a0b4cfa6478fe6724056eacc3697bfee2564aecd6161b189");
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
				reply.header("x-auth-sign", "0210e257b5b22c21827d2ff4f868ae25 ||| f65726f2b60ad05f52987b378175a920ac7095d01bb3456a95709f7b1d13c80f38771a6b1f13fdfc7118922605ffa3e1");
				return reply.code(400).send({
					status: "error",
					message: "Missing leaveId field",
				});
			}

			if (files.length === 0) {
				reply.header("x-auth-sign", "b9b53b137d1768ec83a272b2f7b4ef52 ||| a31a9efd8f043a87f43df0045aa9d740d4f228f931042ecbee9d344595bb2a630e646ffae558d0b2ae8c6f4fc1639e5d");
				return reply.code(400).send({
					status: "error",
					message: "No files uploaded",
				});
			}

			const result = await employeeUploadLeaveAttachments(authHeader, {
				leaveId,
				files,
			});

			reply.header("x-auth-sign", "13ed6440eee07fc6115c1f2d8157d811 ||| 5277922a69bd3bbff44270445b427ca91715bf9e5053be2e1a4c24dc2440d1a0cdc033621ad0773e11ecf016696ca1ba");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				paths: result.paths,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
			reply.header("x-auth-sign", "b20a2c6f154dd0dc5ac57f03a579f187 ||| c839e8df3173860206df7f7ef03dbdd9c0a259d0e1c5091a098b316e6ee0b4587f70c13d2b4643d9dce3ee6d101ff4c0");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not upload attachments",
			});
		}
	});
});


// import fp from "fastify-plugin";
// import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

// export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
// 	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
// 		console.log("📩 Incoming request to upload leave attachments");

// 		const authHeader = request.headers.authorization;

// 		if (!authHeader) {
// 			reply.header("x-auth-sign", "...");
// 			return reply.code(401).send({
// 				status: "error",
// 				message: "Authorization header missing",
// 			});
// 		}

// 		try {
// 			console.log("🔍 Parsing multipart parts...");
// 			const parts = request.parts();
// 			let leaveId = null;
// 			const files = [];

// 			// for await (const part of parts) {
// 			// 	if (part.type === "file") {
// 			// 		console.log(`📂 Got file: ${part.filename}`);
// 			// 		files.push(part);
// 			// 	} else if (part.type === "field" && part.fieldname === "leaveId") {
// 			// 		console.log(`🆔 Got leaveId: ${part.value}`);
// 			// 		leaveId = part.value;
// 			// 	}
// 			// }

// 			console.log("🎯 Beginning multipart iteration");

// 			for await (const part of parts) {
// 				console.log("📦 Got part:", part.type, part.fieldname || part.filename);

// 				if (part.type === "file") {
// 					files.push(part);
// 				} else if (part.type === "field" && part.fieldname === "leaveId") {
// 					leaveId = part.value;
// 				}
// 			}

// 			console.log("✅ Finished parsing parts");

// 			if (!leaveId) {
// 				reply.header("x-auth-sign", "...");
// 				return reply.code(400).send({
// 					status: "error",
// 					message: "Missing leaveId field",
// 				});
// 			}

// 			if (files.length === 0) {
// 				reply.header("x-auth-sign", "...");
// 				return reply.code(400).send({
// 					status: "error",
// 					message: "No files uploaded",
// 				});
// 			}

// 			console.log("🧠 Upload logic triggered");

// 			// ⏱️ Add a timeout just in case something stalls
// 			const result = await Promise.race([
// 				employeeUploadLeaveAttachments(authHeader, { leaveId, files }),
// 				new Promise((_, reject) =>
// 					setTimeout(() => reject(new Error("Upload timed out after 30s")), 30000)
// 				),
// 			]);

// 			reply.header("x-auth-sign", "...");
// 			return reply.code(200).send({
// 				status: "success",
// 				message: result.message,
// 				paths: result.paths,
// 			});
// 		} catch (error) {
// 			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
// 			reply.header("x-auth-sign", "...");
// 			return reply.code(400).send({
// 				status: "error",
// 				message: error.message || "Could not upload attachments",
// 			});
// 		}
// 	});
// });


// import fp from "fastify-plugin";
// import { randomUUID } from "crypto";
// import path from "path";
// import fs from "fs";
// import { pipeline } from "stream/promises";
// import { employeeUploadLeaveAttachments } from "../methods/employeeUploadLeaveAttachments.js";

// const UPLOAD_DIR = path.join(process.cwd(), "media", "leave-attachments");

// export default fp(async function employeeUploadLeaveAttachmentsRoute(fastify) {
// 	fastify.post("/employee/leave/upload-attachments", async (request, reply) => {
// 		request.log.info("📩 Incoming request to upload leave attachments");

// 		const authHeader = request.headers.authorization;

// 		if (!authHeader || !authHeader.startsWith("Bearer ")) {
// 			reply.header("x-auth-sign", "AUTH_MISSING_SIGNATURE");
// 			return reply.code(401).send({
// 				status: "error",
// 				message: "Authorization header missing or invalid",
// 			});
// 		}

// 		const parts = request.parts();
// 		let leaveId = null;
// 		const files = [];

// 		const parseParts = async () => {
// 			request.log.info("🎯 Beginning multipart iteration");

// 			for await (const part of parts) {
// 				if (part.type === "field" && part.fieldname === "leaveId") {
// 					leaveId = part.value;
// 					request.log.info("🆔 Got leaveId:", leaveId);
// 				} else if (part.type === "file" && part.fieldname === "file") {
// 					const ext = path.extname(part.filename);
// 					const filename = `${Date.now()}-${randomUUID()}${ext}`;
// 					const savePath = path.join(UPLOAD_DIR, filename);
// 					const publicPath = `/media/leave-attachments/${filename}`;

// 					if (!fs.existsSync(UPLOAD_DIR)) {
// 						fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// 					}

// 					request.log.info("📂 Saving file:", part.filename, "→", publicPath);
// 					await pipeline(part.file, fs.createWriteStream(savePath));
// 					files.push({
// 						originalName: part.filename,
// 						relativePath: publicPath,
// 						absolutePath: savePath,
// 					});
// 				}
// 			}
// 		};

// 		try {
// 			// Add timeout to parsing just in case
// 			await Promise.race([
// 				parseParts(),
// 				new Promise((_, reject) =>
// 					setTimeout(() => reject(new Error("⏰ Multipart parsing timeout")), 15000)
// 				),
// 			]);

// 			if (!leaveId) {
// 				reply.header("x-auth-sign", "LEAVE_ID_MISSING_SIGNATURE");
// 				return reply.code(400).send({
// 					status: "error",
// 					message: "Missing leaveId field",
// 				});
// 			}

// 			if (files.length === 0) {
// 				reply.header("x-auth-sign", "NO_FILES_SIGNATURE");
// 				return reply.code(400).send({
// 					status: "error",
// 					message: "No files uploaded",
// 				});
// 			}

// 			const result = await employeeUploadLeaveAttachments(authHeader, {
// 				leaveId,
// 				files,
// 			});

// 			reply.header("x-auth-sign", "UPLOAD_SUCCESS_SIGNATURE");
// 			return reply.code(200).send({
// 				status: "success",
// 				message: result.message,
// 				paths: result.paths,
// 			});
// 		} catch (error) {
// 			request.log.error({ err: error }, "❌ Failed to upload leave attachments");
// 			reply.header("x-auth-sign", "UPLOAD_FAIL_SIGNATURE");
// 			return reply.code(500).send({
// 				status: "error",
// 				message: error.message || "Could not upload attachments",
// 			});
// 		}
// 	});
// });
