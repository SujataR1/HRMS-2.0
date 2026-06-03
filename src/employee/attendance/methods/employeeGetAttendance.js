import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import {
	buildPresenceEstimateMap,
	presenceEstimateDateKey,
	serializeAttendancePresenceEstimate,
} from "#src/attendance-presence-estimates/methods/serializeAttendancePresenceEstimate.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Get attendance logs for the currently logged-in employee.
 *
 * @param {Object} params
 * @param {string} params.authHeader     - "Bearer <token>"
 * @param {string} [params.date]         - "YYYY-MM-DD" optional
 * @param {string} [params.monthYear]    - "MM-YYYY" optional
 * @param {string} [params.year]         - "YYYY" optional
 *
 * @returns {Promise<Array>} Attendance entries
 */
export async function employeeGetAttendance({
	authHeader,
	date = null,
	monthYear = null,
	year = null,
}) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Missing or invalid Authorization header");
	}

	let session;

	try {
		session = await verifyEmployeeJWT(authHeader);
	} catch {
		throw new Error("Invalid or expired token");
	}

	const employeeId = session.employeeId;

	let startDateUTC = null;
	let endDateUTC = null;

	try {
		if (date) {
			const istStart = dayjs.tz(date, TIMEZONE).startOf("day");
			const istEnd = istStart.endOf("day");

			startDateUTC = istStart.utc().toDate();
			endDateUTC = istEnd.utc().toDate();
		} else if (monthYear) {
			const [month, yearValue] = monthYear.split("-").map(Number);

			if (!month || !yearValue || month < 1 || month > 12) {
				throw new Error("Invalid monthYear format");
			}

			const istStart = dayjs
				.tz(`${yearValue}-${String(month).padStart(2, "0")}-01`, TIMEZONE)
				.startOf("month");

			const istEnd = istStart.endOf("month");

			startDateUTC = istStart.utc().toDate();
			endDateUTC = istEnd.utc().toDate();
		} else if (year) {
			const yearValue = Number(year);

			if (Number.isNaN(yearValue) || yearValue < 1900 || yearValue > 3000) {
				throw new Error("Invalid year format");
			}

			const istStart = dayjs.tz(`${yearValue}-01-01`, TIMEZONE).startOf("year");
			const istEnd = dayjs.tz(`${yearValue}-12-31`, TIMEZONE).endOf("day");

			startDateUTC = istStart.utc().toDate();
			endDateUTC = istEnd.utc().toDate();
		}
	} catch (err) {
		throw new Error("Invalid date input: " + err.message);
	}

	let logs = [];
	let estimateMap = new Map();

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

		const estimates = logs.length
			? await prisma.attendancePresenceEstimate.findMany({
					where: {
						employeeId,
						attendanceDate: {
							in: logs.map((log) => log.attendanceDate),
						},
					},
				})
			: [];

		estimateMap = buildPresenceEstimateMap(estimates);
	} catch (err) {
		throw new Error("Database error: " + err.message);
	}

	return logs.map((log) => {
		const estimate = estimateMap.get(
			presenceEstimateDateKey(log.attendanceDate)
		);

		return {
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

			presenceEstimate: serializeAttendancePresenceEstimate(estimate),
		};
	});
}