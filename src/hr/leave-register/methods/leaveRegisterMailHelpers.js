// src/hr/leave-register/methods/leaveRegisterMailHelpers.js

import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import { sendHrMail } from "../../mailer/methods/hrMailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export const LEAVE_REGISTER_FIELD_META = [
	{ key: "casualCurrent", label: "Casual Leave - Current" },
	{ key: "casualCarried", label: "Casual Leave - Carried" },
	{ key: "casualTotal", label: "Casual Leave - Total" },

	{ key: "sickCurrent", label: "Sick Leave - Current" },
	{ key: "sickCarried", label: "Sick Leave - Carried" },
	{ key: "sickTotal", label: "Sick Leave - Total" },

	{ key: "bereavementCurrent", label: "Bereavement Leave - Current" },
	{ key: "bereavementCarried", label: "Bereavement Leave - Carried" },
	{ key: "bereavementTotal", label: "Bereavement Leave - Total" },

	{ key: "maternityCurrent", label: "Maternity Leave - Current" },
	{ key: "maternityCarried", label: "Maternity Leave - Carried" },
	{ key: "maternityTotal", label: "Maternity Leave - Total" },

	{ key: "paternityCurrent", label: "Paternity Leave - Current" },
	{ key: "paternityCarried", label: "Paternity Leave - Carried" },
	{ key: "paternityTotal", label: "Paternity Leave - Total" },

	{ key: "earnedCurrent", label: "Earned Leave - Current" },
	{ key: "earnedCarried", label: "Earned Leave - Carried" },
	{ key: "earnedTotal", label: "Earned Leave - Total" },

	{ key: "compOffCurrent", label: "Comp Off - Current" },
	{ key: "compOffCarried", label: "Comp Off - Carried" },
	{ key: "compOffTotal", label: "Comp Off - Total" },

	{ key: "otherCurrent", label: "Other Leave - Current" },
	{ key: "otherCarried", label: "Other Leave - Carried" },
	{ key: "otherTotal", label: "Other Leave - Total" },

	{ key: "grandTotal", label: "Grand Total" },
];

export const CURRENT_LEAVE_FIELDS = [
	"casualCurrent",
	"sickCurrent",
	"bereavementCurrent",
	"maternityCurrent",
	"paternityCurrent",
	"earnedCurrent",
	"compOffCurrent",
	"otherCurrent",
];

export const EDITABLE_LEAVE_REGISTER_FIELDS = LEAVE_REGISTER_FIELD_META
	.map((field) => field.key)
	.filter((key) => key !== "grandTotal");

export const RESETTABLE_LEAVE_REGISTER_FIELDS = LEAVE_REGISTER_FIELD_META.map(
	(field) => field.key
);

function toInteger(value, fieldName) {
	const number = Number(value);

	if (!Number.isInteger(number) || number < 0) {
		throw new Error(`${fieldName} must be a non-negative integer`);
	}

	return number;
}

export function sanitizeLeaveRegisterCreateData(data = {}) {
	const sanitized = {};

	for (const fieldName of CURRENT_LEAVE_FIELDS) {
		sanitized[fieldName] = toInteger(data[fieldName] ?? 0, fieldName);
	}

	return sanitized;
}

export function sanitizeLeaveRegisterUpdateData(data = {}) {
	const sanitized = {};

	for (const fieldName of EDITABLE_LEAVE_REGISTER_FIELDS) {
		if (Object.prototype.hasOwnProperty.call(data, fieldName)) {
			sanitized[fieldName] = toInteger(data[fieldName], fieldName);
		}
	}

	if (Object.keys(sanitized).length === 0) {
		throw new Error("No valid leave register fields were provided for update");
	}

	return sanitized;
}

export function calculateGrandTotal(registerLike = {}) {
	return CURRENT_LEAVE_FIELDS.reduce(
		(total, fieldName) => total + Number(registerLike[fieldName] ?? 0),
		0
	);
}

export function getMailTimestamp() {
	return dayjs().tz(TIMEZONE).format("YYYY-MM-DD hh:mm A");
}

export function buildLeaveRegisterRows(registerLike = {}) {
	return LEAVE_REGISTER_FIELD_META.map(
		({ key, label }) => `
			<tr>
				<td style="padding: 8px; border: 1px solid #ddd;">${label}</td>
				<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${registerLike[key] ?? 0}</td>
			</tr>
		`
	).join("");
}

export function buildLeaveRegisterChangedRows(before = {}, after = {}) {
	const rows = LEAVE_REGISTER_FIELD_META
		.filter(({ key }) => Number(before[key] ?? 0) !== Number(after[key] ?? 0))
		.map(
			({ key, label }) => `
				<tr>
					<td style="padding: 8px; border: 1px solid #ddd;">${label}</td>
					<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${before[key] ?? 0}</td>
					<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${after[key] ?? 0}</td>
				</tr>
			`
		);

	if (rows.length === 0) {
		return `
			<tr>
				<td colspan="3" style="padding: 8px; border: 1px solid #ddd;">
					No numeric leave balance changed.
				</td>
			</tr>
		`;
	}

	return rows.join("");
}

export async function sendLeaveRegisterMailSafely({
	to,
	purpose,
	payload,
	context,
}) {
	try {
		await sendHrMail({ to, purpose, payload });
		return { success: true };
	} catch (error) {
		console.error("🔥 Leave register mail failed:", {
			purpose,
			to,
			context,
			error: error?.message,
		});

		return {
			success: false,
			error: error?.message || "Mail sending failed",
		};
	}
}