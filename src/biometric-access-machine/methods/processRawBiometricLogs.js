const CONNECTOR_FORMAT_MARKER = "BIOCONNECTOR_V2";

const IDENTIFIER_MAP = {
	1: "fingerprint",
	4: "card",
};

const PUNCH_STATE_MAP = {
	0: "in",
	1: "out",
};

function parseIntegerCode(value) {
	const text = String(value ?? "").trim();

	if (!/^-?\d+$/.test(text)) {
		return null;
	}

	return Number(text);
}

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

		const hasConnectorV2Marker =
			columns[columns.length - 1] === CONNECTOR_FORMAT_MARKER;

		const punchStateCode = hasConnectorV2Marker
			? parseIntegerCode(columns[2])
			: null;

		const identifierCode = parseIntegerCode(columns[3]);

		const punchState =
			punchStateCode === null
				? null
				: PUNCH_STATE_MAP[punchStateCode] ?? null;

		const identifier =
			identifierCode === null
				? "unknown"
				: IDENTIFIER_MAP[identifierCode] || "unknown";

		logs.push({
			employeeId,
			timestamp,
			identifier,
			punchState,
		});
	}

	return logs;
}