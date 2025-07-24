import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";
import { sendAdminMail } from "../../mailer/methods/adminMailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

const prisma = new PrismaClient();

/**
 * Edits an existing attendance entry for a given employee and date.
 * Requires valid admin token.
 */
export async function adminEditAnAttendanceEntry(
	authHeader,
	{ employeeId, attendanceDate, punchIn, punchOut, status, flags, comments }
) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma;
		

		const result = await db.$transaction(async (tx) => {
			const { adminId } = await verifyAdminJWT(authHeader);

			const admin = await tx.admin.findUnique({
				where: { id: adminId },
			});
			if (!admin) throw new Error("Admin not found");

			const employee = await tx.employee.findUnique({
				where: { employeeId: employeeId },
			});
			if (!employee) throw new Error("Employee not found");

			const dateObj = dayjs
			.tz(attendanceDate, TIMEZONE) // interpret as IST
			.startOf("day")                // lock to midnight IST
			.format("YYYY-MM-DD HH:mm:ss"); // as a raw string without timezone

			console.log(`attendanceDate:${attendanceDate}`)
			console.log(`dateObj:${dateObj}`)

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

			if (!existing) {
				throw new Error(
					"Attendance record not found for the given date"
				);
			}

			const sanitizedFlags = Array.isArray(flags) ? [...flags] : [];
			if (!sanitizedFlags.includes("edited")) {
				sanitizedFlags.push("edited");
			}

			const punchInUTC = punchIn ? dayjs.tz(punchIn, TIMEZONE).utc().toDate() : null;
			const punchOutUTC = punchOut ? dayjs.tz(punchOut, TIMEZONE).utc().toDate() : null;

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

			await sendAdminMail({
				to: employee.assignedEmail,
				purpose: "attendanceEntryEdited",
				payload: {
					name: employee.name,
					attendanceDate: dayjs(dateObj)
						.tz(TIMEZONE)
						.format("YYYY-MM-DD"),
					editTimestamp: dayjs()
						.tz(TIMEZONE)
						.format("YYYY-MM-DD hh:mm A"),

					oldPunchIn: existing.punchIn
						? dayjs
								.utc(existing.punchIn)
								.tz(TIMEZONE)
								.format("hh:mm A")
						: "—",
					oldPunchOut: existing.punchOut
						? dayjs
								.utc(existing.punchOut)
								.tz(TIMEZONE)
								.format("hh:mm A")
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
		console.error("🔥 Error in adminEditAnAttendanceEntry:", err);
		try {
			if (db) 
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
