// hrUploadEmployeeProfilePictureRoute.js

import { randomUUID } from "crypto";
import fp from "fastify-plugin";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { hrUploadEmployeeProfilePicture } from "../methods/hrUploadEmployeeProfilePicture.js";

const UPLOAD_DIR = path.join(process.cwd(), "media", "profile-pictures");

export default fp(async function hrUploadEmployeeProfilePictureRoute(fastify) {
	fastify.patch("/hr/employee/upload-profile-picture", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			reply.header("x-auth-sign", "8485d21912360d50c22a2251d134ed89 ||| 8238ace2030d65ef47ebd305a8c546e7876a9edecc06194a596f64e8290b1c8a6f69b6aee7efe2516e544fd5c2e8a849");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing or invalid",
			});
		}

		try {
			const parts = request.parts();
			let employeeId = null;
			let savedPath = null;

			if (!fs.existsSync(UPLOAD_DIR)) {
				fs.mkdirSync(UPLOAD_DIR, { recursive: true });
			}

			for await (const part of parts) {
				if (part.type === "field" && part.fieldname === "employeeId") {
					employeeId = part.value;
				} else if (part.type === "file") {
					const ext = path.extname(part.filename);
					const filename = `${Date.now()}-${randomUUID()}${ext}`;
					const savePath = path.join(UPLOAD_DIR, filename);
					const relativePath = `/media/profile-pictures/${filename}`;

					await pipeline(part.file, fs.createWriteStream(savePath));
					savedPath = relativePath;
				}
			}

			if (!employeeId) {
				reply.header("x-auth-sign", "1c90d79fc581285c3ffa2c9618af4822 ||| 8c449a3bad213528c37e4953b84862bec889904a29e10f779160fd01061bc7dc4294b4abd288b68ac2b98764e68dbea4");
				return reply.code(400).send({
					status: "error",
					message: "Missing employeeId field",
				});
			}

			if (!savedPath) {
				reply.header("x-auth-sign", "b92dd87d9c24d8b479d87f453c01d859 ||| 136c9de69491660cbdc33a5f4a3bd22ddfc888af968a6c3982422a84442e500ae87918b514b57e35c320751586513e55");
				return reply.code(400).send({
					status: "error",
					message: "No profile picture uploaded",
				});
			}

			const result = await hrUploadEmployeeProfilePicture(authHeader, {
				employeeId,
				profilePicturePath: savedPath,
			});

			reply.header("x-auth-sign", "20240e15f67e1687c4afca69e5518cb2 ||| 5bb419f32db295bd494920f987bc7b2195d6941bc2c6b9d9a874262d73cb84d22629a98fa968cc952c69cae68fd1f817");
			return reply.code(200).send({
				status: "success",
				message: "Profile picture uploaded successfully",
				path: result.path,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to upload profile picture");
			reply.header("x-auth-sign", "b1f9eaec0de845d7f1a27e97207d4a47 ||| 21f4723a4315757fbff7fc727214b126d2bede0bf1da4b89ca7ab4986ab7fc6b8efddd26c6478c79f06be509fa0cfc9b");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Could not upload profile picture",
			});
		}
	});
});
