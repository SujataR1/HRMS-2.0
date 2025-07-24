import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getLastSyncDateTime() {
	let db;

	try {
		db = prisma;

		

		const tx = await db.$transaction(async (tx) => {
			const latestLog = await tx.biometricLog.findFirst({
				orderBy: {
					timestamp: "desc",
				},
			});

			return latestLog?.timestamp || null;
		});

		
		return tx;
	} catch (error) {
		console.error("🔥 Error while fetching last sync timestamp:", error);
		try {
			if (db) 
		} catch (disconnectErr) {
			console.error(
				"🧨 Error while disconnecting from DB:",
				disconnectErr
			);
		}
		throw error;
	}
}
