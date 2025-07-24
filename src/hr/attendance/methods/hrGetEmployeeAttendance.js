import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Fetch attendance logs for a given employee (or date range).
 *
 * @param {Object} params
 * @param {string} params.authHeader     – "Bearer <token>"
 * @param {string} params.employeeId     – The employee’s UUID
 * @param {string} [params.date]         – "YYYY-MM-DD"
 * @param {string} [params.monthYear]    – "MM-YYYY"
 * @param {string} [params.year]         – "YYYY"
 */
export async function hrGetEmployeeAttendance({
	authHeader,
	employeeId,
	date = null,
	monthYear = null,
	year = null,
}) {
	if (!authHeader) throw new Error("Missing authorization token");
	if (!employeeId) throw new Error("employeeId is required");

	/* -------------------------------------------------- *
	 * 1️⃣  Verify HR session
	 * -------------------------------------------------- */
	// try {
		await verifyHrJWT(authHeader);
	// } catch {
	// 	throw new Error("Invalid or expired HR token");
	// }

	/* -------------------------------------------------- *
	 * 2️⃣  Derive UTC date range (if any)
	 * -------------------------------------------------- */
	let startDateUTC = null;
	let endDateUTC = null;

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

	/* -------------------------------------------------- *
	 * 3️⃣  Query Prisma for logs
	 * -------------------------------------------------- */
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
			orderBy: { attendanceDate: "asc" },
		});
	} catch (err) {
		throw new Error(
			"Database error while fetching attendance logs: " + err.message
		);
	}

	/* -------------------------------------------------- *
	 * 4️⃣  Format + return
	 * -------------------------------------------------- */
	return logs.map((log) => ({
		id: log.id,
		employeeId: log.employeeId,
		day: log.attendanceDay,
		date: dayjs.utc(log.attendanceDate).tz(TIMEZONE).format("YYYY-MM-DD"),
		punchIn: log.punchIn
			? dayjs.utc(log.punchIn).tz(TIMEZONE).format("hh:mm:ss a")
			: null,
		punchOut: log.punchOut
			? dayjs.utc(log.punchOut).tz(TIMEZONE).format("hh:mm:ss a")
			: null,
		status: log.status,
		flags: log.flags,
		comments: log.comments,
	}));
}
