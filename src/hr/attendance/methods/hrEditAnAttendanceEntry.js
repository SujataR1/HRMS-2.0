import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import { sendHrMail } from "../../mailer/methods/hrMailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";
/**
 * HR-only: edit an existing attendance entry for an employee & date.
 *
 * @param {string} authHeader  – "Bearer <token>"
 * @param {Object}  payload    – { employeeId, attendanceDate, punchIn, punchOut, status, flags, comments }
 */
export async function hrEditAnAttendanceEntry(
	authHeader,
	{ employeeId, attendanceDate, punchIn, punchOut, status, flags, comments }
) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer "))
			throw new Error("Authorization header missing or invalid");

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			/* 1️⃣  Verify HR token & existence */
			const { hrId } = await verifyHrJWT(authHeader);
			const hr = await tx.hr.findUnique({ where: { id: hrId } });
			if (!hr) throw new Error("HR account not found");

			/* 2️⃣  Validate employee exists */
			const employee = await tx.employee.findUnique({
				where: { employeeId: employeeId },
			});
			if (!employee) throw new Error("Employee not found");

			/* 3️⃣  Fetch existing attendance record */
			const dateObj = dayjs
			.tz(attendanceDate, TIMEZONE) // interpret as IST
			.startOf("day")                // lock to midnight IST
			.format("YYYY-MM-DD HH:mm:ss"); // as a raw string without timezone

			const start = dayjs
			.tz(attendanceDate, TIMEZONE)
			.startOf("day")
			.toDate();

			const end = dayjs
			.tz(attendanceDate, TIMEZONE)
			.endOf("day")
			.toDate();

			const existing = await tx.attendanceLog.findFirst({
			where: {
				employeeId,
				attendanceDate: {
				gte: start,
				lte: end,
				},
			},
			});

			if (!existing)
				throw new Error("Attendance record not found for the given date");

			/* 4️⃣  Prepare updates */
			const sanitizedFlags = Array.isArray(flags) ? [...flags] : [];
			if (!sanitizedFlags.includes("edited")) sanitizedFlags.push("edited");

			const punchInUTC = punchIn ? dayjs(punchIn).utc().toDate() : null;
			const punchOutUTC = punchOut ? dayjs(punchOut).utc().toDate() : null;

			/* 5️⃣  Persist changes */
			await tx.attendanceLog.update({
				where: { id: existing.id },
				data: {
					punchIn: punchInUTC,
					punchOut: punchOutUTC,
					status,
					flags: sanitizedFlags,
					comments,
					updatedAt: new Date(),
				},
			});

			/* 6️⃣  Notify employee */
			await sendHrMail({
				employeeId: employee.employeeId,
				to: employee.assignedEmail,
				purpose: "attendanceEntryEdited",
				payload: {
					name: employee.name,
					attendanceDate: dayjs(dateObj)
						.tz(TIMEZONE)
						.format("YYYY-MM-DD"),
					editTimestamp: dayjs().tz(TIMEZONE).format("YYYY-MM-DD hh:mm A"),

					oldPunchIn: existing.punchIn
						? dayjs.utc(existing.punchIn).tz(TIMEZONE).format("hh:mm A")
						: "—",
					oldPunchOut: existing.punchOut
						? dayjs.utc(existing.punchOut).tz(TIMEZONE).format("hh:mm A")
						: "—",
					oldStatus: existing.status || "—",
					oldFlags: (existing.flags || []).join(", ") || "—",
					oldComments: existing.comments || "—",

					newPunchIn: punchIn
						? dayjs.tz(punchIn, TIMEZONE).format("hh:mm A")
						: "—",
					newPunchOut: punchOut
						? dayjs.tz(punchOut, TIMEZONE).format("hh:mm A")
						: "—",
					newStatus: status || "—",
					newFlags: sanitizedFlags.join(", ") || "—",
					newComments: comments || "—",

					subject: "Your Attendance Entry Was Updated",
				},
			});

			return {
				success: true,
				message: "Attendance updated successfully",
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in hrEditAnAttendanceEntry:", err);
		
		throw err;
	}
}
