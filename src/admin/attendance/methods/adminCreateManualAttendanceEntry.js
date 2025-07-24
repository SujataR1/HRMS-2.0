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
 * Creates a new manual attendance entry for an employee by an admin.
 */
export async function adminCreateManualAttendanceEntry(
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
				.tz(attendanceDate, TIMEZONE)
				.startOf("day")
				.toDate();
			const weekday = dayjs(dateObj).format("dddd");

			const existing = await tx.attendanceLog.findUnique({
				where: {
					employeeId_attendanceDate: {
						employeeId,
						attendanceDate: dateObj,
					},
				},
			});

			if (existing) {
				throw new Error(
					"Attendance already exists for this employee on that date"
				);
			}

			const punchInUTC = punchIn
				? dayjs.tz(punchIn, TIMEZONE).utc().toDate()
				: null;

			const punchOutUTC = punchOut
				? dayjs.tz(punchOut, TIMEZONE).utc().toDate()
				: null;

			const sanitizedFlags = Array.isArray(flags) ? [...flags] : [];
			if (!sanitizedFlags.includes("manualEntry")) {
				sanitizedFlags.push("manualEntry");
			}
			if (!sanitizedFlags.includes("edited")) {
				sanitizedFlags.push("edited");
			}

			await tx.attendanceLog.create({
				data: {
					employeeId,
					attendanceDate: dateObj,
					attendanceDay: weekday,
					punchIn: punchInUTC,
					punchOut: punchOutUTC,
					status,
					flags: sanitizedFlags,
					comments,
				},
			});

			// 📩 Notify the employee
			try {
				await sendAdminMail({
					to: employee.assignedEmail,
					purpose: "attendanceEntryCreated",
					payload: {
						name: employee.name,
						attendanceDate: dayjs(dateObj)
							.tz(TIMEZONE)
							.format("YYYY-MM-DD"),
						creationTimestamp: dayjs()
							.tz(TIMEZONE)
							.format("YYYY-MM-DD hh:mm A"),
						punchIn: punchIn
							? dayjs.tz(punchIn, TIMEZONE).format("hh:mm A")
							: "—",
						punchOut: punchOut
							? dayjs.tz(punchOut, TIMEZONE).format("hh:mm A")
							: "—",
						status: status || "—",
						flags: sanitizedFlags.join(", ") || "—",
						comments: comments || "—",
						subject: "A Manual Attendance Entry Was Added",
					},
				});
			} catch (mailErr) {
				console.error(
					"📭 Failed to send manual attendance entry email:",
					mailErr
				);
			}

			return {
				success: true,
				message: "Manual attendance entry created successfully",
			};
		});

		
		return result;
	} catch (err) {
		console.error("🔥 Error in adminCreateManualAttendanceEntry:", err);
		try {
			if (db) 
		} catch (disconnectErr) {
			console.error("🧨 DB disconnect error:", disconnectErr);
		}
		throw err;
	}
}
