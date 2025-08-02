import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Get attendance logs for the currently logged-in employee.
 *
 * @param {Object} params
 * @param {string} params.authHeader     – "Bearer <token>"
 * @param {string} [params.date]         – "YYYY-MM-DD" (optional)
 * @param {string} [params.monthYear]    – "MM-YYYY" (optional)
 * @param {string} [params.year]         – "YYYY" (optional)
 *
 * @returns {Promise<Array>}             – Attendance entries
 */
export async function employeeGetAttendance({
	authHeader,
	date = null,
	monthYear = null,
	year = null,
}) {
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throw new Error("Missing or invalid Authorization header");

	// 1️⃣ Authenticate employee
	let session;
	try {
		session = await verifyEmployeeJWT(authHeader);
	} catch {
		throw new Error("Invalid or expired token");
	}

	const employeeId = session.employeeId;
	let startDateUTC = null;
	let endDateUTC = null;

	// 2️⃣ Calculate time window
	try {
		if (date) {
			const istStart = dayjs.tz(date, TIMEZONE).startOf("day");
			const istEnd = istStart.endOf("day");
			startDateUTC = istStart.utc().toDate();
			endDateUTC = istEnd.utc().toDate();
		} else if (monthYear) {
			const [month, yearVal] = monthYear.split("-").map(Number);
			if (!month || !yearVal || month < 1 || month > 12)
				throw new Error("Invalid monthYear format");
			const istStart = dayjs
				.tz(`${yearVal}-${String(month).padStart(2, "0")}-01`, TIMEZONE)
				.startOf("month");
			const istEnd = istStart.endOf("month");
			startDateUTC = istStart.utc().toDate();
			endDateUTC = istEnd.utc().toDate();
		} else if (year) {
			const y = Number(year);
			if (isNaN(y) || y < 1900 || y > 3000)
				throw new Error("Invalid year format");
			const istStart = dayjs.tz(`${y}-01-01`, TIMEZONE).startOf("year");
			const istEnd = dayjs.tz(`${y}-12-31`, TIMEZONE).endOf("day");
			startDateUTC = istStart.utc().toDate();
			endDateUTC = istEnd.utc().toDate();
		}
	} catch (err) {
		throw new Error("Invalid date input: " + err.message);
	}

	// 3️⃣ Query DB
	let logs;
	try {
		logs = await prisma.attendanceLog.findMany({
			where: {
				employeeId,
				...(startDateUTC &&
					endDateUTC && {
						attendanceDate: {
							gte: startDateUTC,
							lte: endDateUTC,
						},
					}),
			},
			orderBy: {
				attendanceDate: "asc",
			},
		});
	} catch (err) {
		throw new Error("Database error: " + err.message);
	}

	// 4️⃣ Format result
	return logs.map((log) => ({
		id: log.id,
		date: dayjs.utc(log.attendanceDate).tz(TIMEZONE).format("YYYY-MM-DD"),
		day: log.attendanceDay,
		punchIn: log.punchIn
			? dayjs.utc(log.punchIn).tz(TIMEZONE).format("hh:mm:ss a")
			: null,
		punchOut: log.punchOut
			? dayjs.utc(log.punchOut).tz(TIMEZONE).format("hh:mm:ss a")
			: null,
		durationInOfficeMinutes: log.durationInOfficeMinutes,
		status: log.status,
		flags: log.flags,
		comments: log.comments,
	}));
}
