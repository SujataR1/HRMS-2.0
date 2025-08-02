import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function adminGetEmployeeAttendance({
	authHeader,
	employeeId,
	date = null,
	monthYear = null,
	year = null,
}) {
	if (!authHeader) throw new Error("Missing authorization token");
	if (!employeeId) throw new Error("employeeId is required");

	let adminSession;
	try {
		adminSession = await verifyAdminJWT(authHeader);
	} catch {
		throw new Error("Invalid or expired admin token");
	}

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
		throw new Error(
			"Database error while fetching attendance logs: " + err.message
		);
	}

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
		durationInOfficeMinutes: log.durationInOfficeMinutes,
		flags: log.flags,
		comments: log.comments,
	}));
}
