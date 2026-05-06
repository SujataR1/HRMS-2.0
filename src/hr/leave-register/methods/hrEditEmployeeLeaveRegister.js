import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import { sendHrMail } from "../../mailer/methods/hrMailer.js";

const prisma = new PrismaClient();

const CURRENT_FIELDS = [
	"casualCurrent",
	"sickCurrent",
	"bereavementCurrent",
	"maternityCurrent",
	"paternityCurrent",
	"earnedCurrent",
	"compOffCurrent",
	"otherCurrent",
];

const FIELD_LABELS = {
	casualCurrent: "Casual Current",
	casualCarried: "Casual Carried",
	casualTotal: "Casual Total",

	sickCurrent: "Sick Current",
	sickCarried: "Sick Carried",
	sickTotal: "Sick Total",

	bereavementCurrent: "Bereavement Current",
	bereavementCarried: "Bereavement Carried",
	bereavementTotal: "Bereavement Total",

	maternityCurrent: "Maternity Current",
	maternityCarried: "Maternity Carried",
	maternityTotal: "Maternity Total",

	paternityCurrent: "Paternity Current",
	paternityCarried: "Paternity Carried",
	paternityTotal: "Paternity Total",

	earnedCurrent: "Earned Current",
	earnedCarried: "Earned Carried",
	earnedTotal: "Earned Total",

	compOffCurrent: "Comp Off Current",
	compOffCarried: "Comp Off Carried",
	compOffTotal: "Comp Off Total",

	otherCurrent: "Other Current",
	otherCarried: "Other Carried",
	otherTotal: "Other Total",
};

function calculateGrandTotal(register) {
	return CURRENT_FIELDS.reduce(
		(sum, field) => sum + Number(register[field] ?? 0),
		0
	);
}

function buildEditSummary({ before, after, edits }) {
	return edits
		.map(({ field, mode, val }) => {
			const label = FIELD_LABELS[field] || field;
			const oldValue = before[field] ?? 0;
			const newValue = after[field] ?? 0;

			let operation;

			if (mode === "reset") {
				operation = `reset to ${Number(val ?? 0)}`;
			} else if (mode === "increment") {
				operation = `incremented by ${val}`;
			} else if (mode === "decrement") {
				operation = `decremented by ${val}`;
			} else {
				operation = mode;
			}

			return `<li><strong>${label}</strong>: ${operation}. Previous: ${oldValue}, Updated: ${newValue}</li>`;
		})
		.join("");
}

/**
 * HR-only: edit an employee leave register.
 *
 * Expected payload:
 * {
 *   employeeId: string,
 *   edits: [
 *     {
 *       field: string,
 *       mode: "increment" | "decrement" | "reset",
 *       val?: number
 *     }
 *   ]
 * }
 *
 * Existing FE contract:
 * - increment + val => old + val
 * - decrement + val => max(0, old - val)
 * - reset + val => set field to val
 * - reset without val => set field to 0
 */
export async function hrEditEmployeeLeaveRegister(authHeader, data) {
	if (!authHeader?.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	const { employeeId, edits } = data;

	if (!employeeId) {
		throw new Error("Employee ID is required");
	}

	if (!Array.isArray(edits) || edits.length === 0) {
		throw new Error("At least one edit must be specified");
	}

	const { hrId } = await verifyHrJWT(authHeader);

	const hr = await prisma.hr.findUnique({
		where: { id: hrId },
	});
	if (!hr) throw new Error("HR account not found");

	const employee = await prisma.employee.findUnique({
		where: { employeeId },
	});
	if (!employee) throw new Error("Employee not found");

	const existing = await prisma.leaveRegister.findUnique({
		where: { employeeId },
	});
	if (!existing) throw new Error("Leave register not found for this employee");

	const next = { ...existing };
	const touchedFields = new Set();

	for (const edit of edits) {
		const { field, mode, val } = edit;

		if (!field || !mode) {
			throw new Error("Each edit must include field and mode");
		}

		const currentValue = Number(next[field] ?? 0);

		if (mode === "reset") {
			next[field] = Number(val ?? 0);
			touchedFields.add(field);
			continue;
		}

		if (typeof val !== "number") {
			throw new Error(`Value is required for ${mode} operation on ${field}`);
		}

		if (mode === "increment") {
			next[field] = currentValue + val;
			touchedFields.add(field);
			continue;
		}

		if (mode === "decrement") {
			next[field] = Math.max(0, currentValue - val);
			touchedFields.add(field);
			continue;
		}

		throw new Error(`Unsupported edit mode: ${mode}`);
	}

	const updateData = {};

	for (const field of touchedFields) {
		updateData[field] = next[field];
	}

	const currentFieldWasTouched = [...touchedFields].some((field) =>
		CURRENT_FIELDS.includes(field)
	);

	if (currentFieldWasTouched) {
		updateData.grandTotal = calculateGrandTotal(next);
	}

	const updated = await prisma.leaveRegister.update({
		where: { employeeId },
		data: updateData,
	});

	await sendHrMail({
		employeeId: employee.employeeId,
		to: employee.assignedEmail,
		purpose: "leaveRegisterEdited",
		payload: {
			name: employee.name,
			employeeId: employee.employeeId,

			editSummary: buildEditSummary({
				before: existing,
				after: updated,
				edits,
			}),

			oldGrandTotal: existing.grandTotal,
			newGrandTotal: updated.grandTotal,

			subject: "Your Leave Register Was Updated",
		},
	});

	return {
		success: true,
		message: "Leave register updated",
		updated,
	};
}