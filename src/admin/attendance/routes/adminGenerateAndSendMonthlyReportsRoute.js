import fp from "fastify-plugin";
import { AdminGenerateAndSendMonthlyReportsSchema } from "../schemas/adminGenerateAndSendMonthlyReportsSchema.js";
import { adminGenerateAndSendMonthlyReports } from "../methods/adminGenerateAndSendMonthlyReports.js";

export default fp(
	async function adminGenerateAndSendMonthlyReportsRoute(fastify) {
		fastify.post(
			"/admin/attendance/send-monthly-reports",
			async (request, reply) => {
				const authHeader = request.headers.authorization;

				if (!authHeader) {
					reply.header("x-auth-sign", "8dc55c000fb046c602a89828eae247f2 ||| ba3816183b5c9b9b18097935e13ddc853cc75325be3f03fccdf7465647bfa6c2ced338a4072edfed54df70537d2844a1");
					return reply.code(401).send({
						success: false,
						error: "Authorization header missing",
					});
				}

				const parsed =
					AdminGenerateAndSendMonthlyReportsSchema.safeParse(
						request.body
					);

				if (!parsed.success) {
					reply.header("x-auth-sign", "c8284126a796fca2c549efd8ddc0ec67 ||| 32a1fdee3e928001a4d5fbbb43edd048b074256e14a00da52a5ec7533014bb6fb06c92357ca161ae3333952704e1b0b3");
					return reply.code(400).send({
						success: false,
						error: "Invalid input",
						details: parsed.error.flatten(),
					});
				}

				try {
					const result = await adminGenerateAndSendMonthlyReports({
						authHeader,
						...parsed.data,
					});

					reply.header("x-auth-sign", "d291a7d4a67ef7074531bed2ab4b7c49 ||| 76a5080cb000a3c9a8357211b3212d217fa67954fcaceb188936555adf5e8e78e162076fab93c3c9b9c6d5d294720789");
					return reply.code(200).send(result);
				} catch (err) {
					request.log.error(
						{ err },
						"❌ Error generating/sending monthly reports"
					);
					reply.header("x-auth-sign", "b99b84f8e60e15b9ead65004c5ecdd06 ||| 999062eafb7b549ece256d0ba2ef46470146469c655d8766ba6310cf70e340cf89e0e5ae036708e3b8d24f22a7277994");
					return reply.code(500).send({
						success: false,
						error: "Internal server error",
						detail: err.message,
					});
				}
			}
		);
	}
);
