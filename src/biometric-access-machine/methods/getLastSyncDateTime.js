import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getLastSyncDateTime() {
	let db;

	try {
		db = prisma;

		await db.$connect();

		const tx = await db.$transaction(async (tx) => {
			const latestLog = await tx.biometricLog.findFirst({
				orderBy: {
					timestamp: "desc",
				},
			});

			return latestLog?.timestamp || null;
		});

		await db.$disconnect();
		return tx;
	} catch (error) {
		console.error("🔥 Error while fetching last sync timestamp:", error);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error(
				"🧨 Error while disconnecting from DB:",
				disconnectErr
			);
		}
		throw error;
	}
}
