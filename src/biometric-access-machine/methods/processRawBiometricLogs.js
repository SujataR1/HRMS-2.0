const IDENTIFIER_MAP = {
	1: "fingerprint",
	4: "card",
};

export async function processRawBiometricLogs(rawData = "") {
	if (typeof rawData !== "string" || !rawData.trim()) {
		throw new Error("Raw biometric data must be a non-empty string");
	}

	const rows = rawData.trim().split("\n");
	const logs = [];

	for (const row of rows) {
		if (row.startsWith("OPLOG")) continue;
		const columns = row.trim().split("\t");
		if (columns.length < 4) continue;

		const employeeId = columns[0];
		const timestamp = columns[1];
		const statusCode = columns[3];
		const identifier = IDENTIFIER_MAP[statusCode] || "unknown";

		if (!identifier) continue;

		logs.push({
			employeeId,
			timestamp,
			identifier,
		});
	}

	return logs;
}
