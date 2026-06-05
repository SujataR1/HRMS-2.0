import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import {
	buildPresenceEstimateMap,
	presenceEstimateDateKey,
	serializeAttendancePresenceEstimate,
} from "#src/attendance-presence-estimates/methods/serializeAttendancePresenceEstimate.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

function serializeAttendanceLog(log, presenceRow) {
	if (!log) return null;

	return {
		id: log.id,
		employeeId: log.employeeId,
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

		presence: serializeAttendancePresenceEstimate(presenceRow),
	};
}

function serializePunch(log) {
	return {
		id: log.id,
		employeeId: log.employeeId,
		date: dayjs.utc(log.timestamp).tz(TIMEZONE).format("YYYY-MM-DD"),
		time: dayjs.utc(log.timestamp).tz(TIMEZONE).format("hh:mm:ss a"),
		timestamp: dayjs.utc(log.timestamp).tz(TIMEZONE).format("YYYY-MM-DD HH:mm:ss"),
		timestampUtc: dayjs.utc(log.timestamp).toISOString(),
		identifier: log.identifier,
		punchState: log.punchState,
	};
}

/**
 * Fetch raw biometric punches and the derived attendance row for one employee-day.
 *
 * Raw punches are source facts.
 * Attendance row is the derived employee-day result.
 *
 * @param {Object} params
 * @param {string} params.employeeId
 * @param {string} params.date - YYYY-MM-DD in configured TIMEZONE
 */
export async function getEmployeeDayPunches({ employeeId, date }) {
	if (!employeeId) {
		throw new Error("employeeId is required");
	}

	if (!date) {
		throw new Error("date is required");
	}

	const istStart = dayjs.tz(date, TIMEZONE).startOf("day");
	const istEnd = istStart.endOf("day");

	if (!istStart.isValid()) {
		throw new Error("Invalid date");
	}

	const startDateUTC = istStart.utc().toDate();
	const endDateUTC = istEnd.utc().toDate();

	const [attendanceLog, punches] = await Promise.all([
		prisma.attendanceLog.findFirst({
			where: {
				employeeId,
				attendanceDate: {
					gte: startDateUTC,
					lte: endDateUTC,
				},
			},
		}),

		prisma.biometricLog.findMany({
			where: {
				employeeId,
				timestamp: {
					gte: startDateUTC,
					lte: endDateUTC,
				},
			},
			select: {
				id: true,
				employeeId: true,
				timestamp: true,
				identifier: true,
				punchState: true,
			},
			orderBy: {
				timestamp: "asc",
			},
		}),
	]);

	const presenceRows = attendanceLog
		? await prisma.attendancePresenceEstimate.findMany({
				where: {
					employeeId,
					attendanceDate: attendanceLog.attendanceDate,
				},
			})
		: [];

	const presenceMap = buildPresenceEstimateMap(presenceRows);
	const presenceRow = attendanceLog
		? presenceMap.get(presenceEstimateDateKey(attendanceLog.attendanceDate))
		: null;

	return {
		employeeId,
		date: istStart.format("YYYY-MM-DD"),
		day: istStart.format("dddd"),
		attendance: serializeAttendanceLog(attendanceLog, presenceRow),
		punches: punches.map(serializePunch),
	};
}