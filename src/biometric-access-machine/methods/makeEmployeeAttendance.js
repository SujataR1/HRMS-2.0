import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import os from "os";
import pMap from "p-map";
import { processAttendanceStatuses } from "./processAttendanceStatuses.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";
const CORES = os.cpus().length;

export async function makeEmployeeAttendance({
	employeeId = null,
	date = null,
	monthYear = null,
	year = null,
} = {}) {
	const istNow = dayjs().tz(TIMEZONE);

	async function getAllDatesToProcess() {
		if (date) return [dayjs.tz(date, TIMEZONE).startOf("day")];
		if (monthYear) {
			const [m, y] = monthYear.split("-").map(Number);
			const base = dayjs.tz(`${y}-${m}-01`, TIMEZONE).startOf("month");
			return Array.from({ length: base.daysInMonth() }, (_, i) =>
				base.add(i, "day")
			);
		}
		if (year) {
			const base = dayjs.tz(`${year}-01-01`, TIMEZONE).startOf("year");
			const days = [];
			for (let i = 0; ; i++) {
				const d = base.add(i, "day");
				if (d.year() !== year) break;
				days.push(d);
			}
			return days;
		}
		const firstLog = await prisma.biometricLog.findFirst({
			orderBy: { timestamp: "asc" },
			select: { timestamp: true },
		});
		if (!firstLog) return [];
		const firstDay = dayjs
			.utc(firstLog.timestamp)
			.tz(TIMEZONE)
			.startOf("day");
		const diffDays = istNow.startOf("day").diff(firstDay, "day");
		return Array.from({ length: diffDays + 1 }, (_, i) =>
			firstDay.add(i, "day")
		);
	}

	const allDays = await getAllDatesToProcess();
	if (!allDays.length) return;

	const sorted = allDays.slice().sort((a, b) => a.valueOf() - b.valueOf());
	const firstDay = sorted[0].startOf("day");
	const lastDay = sorted[sorted.length - 1].endOf("day");

	const allAssignments = await prisma.employeeDetails.findMany({
		where: employeeId ? { employeeId } : {},
		select: { assignedShiftId: true },
	});

	const relevantShiftIds = Array.from(
		new Set(allAssignments.map((e) => e.assignedShiftId).filter(Boolean))
	);

	const [rawLogs, rawHolidays] = await Promise.all([
		prisma.biometricLog.findMany({
			where: {
				timestamp: {
					gte: firstDay.utc().toDate(),
					lte: lastDay.utc().toDate(),
				},
			},
			orderBy: { timestamp: "asc" },
		}),
		prisma.holiday.findMany({
			where: {
				date: { gte: firstDay.toDate(), lte: lastDay.toDate() },
				isActive: true,
				OR: [
					{ forShiftId: null },
					{ forShiftId: { in: relevantShiftIds } },
				],
			},
			select: { date: true, forShiftId: true },
		}),
	]);

	const logsMap = new Map();
	for (const log of rawLogs) {
		const emp = log.employeeId;
		const dayKey = dayjs
			.utc(log.timestamp)
			.tz(TIMEZONE)
			.format("YYYY-MM-DD");
		if (!logsMap.has(emp)) logsMap.set(emp, new Map());
		const m = logsMap.get(emp);
		if (!m.has(dayKey)) m.set(dayKey, []);
		m.get(dayKey).push(log);
	}

	const rawLeaves = await prisma.leave.findMany({
		where: {
			status: "approved",
			fromDate: { lte: lastDay.toDate() },
			toDate: { gte: firstDay.toDate() },
			...(employeeId ? { employeeId } : {}),
		},
		select: {
			employeeId: true,
			fromDate: true,
			toDate: true,
			leaveType: true,
		},
	});

	const leaveMap = new Map();
	for (const leave of rawLeaves) {
		let start = dayjs.utc(leave.fromDate).tz(TIMEZONE).startOf("day");
		let end = dayjs.utc(leave.toDate).tz(TIMEZONE).endOf("day");

		for (
			let d = start.clone();
			d.isSameOrBefore(end);
			d = d.add(1, "day")
		) {
			const key = `${leave.employeeId}_${d.format("YYYY-MM-DD")}`;
			leaveMap.set(key, leave.leaveType);
		}
	}

	const allEmployees = employeeId
		? [{ employeeId }]
		: await prisma.employee.findMany({ select: { employeeId: true } });

	const assignments = await prisma.employeeDetails.findMany({
		where: { employeeId: { in: allEmployees.map((e) => e.employeeId) } },
		select: { employeeId: true, assignedShiftId: true },
	});

	const employeeShiftMap = new Map(
		assignments
			.filter((a) => a.assignedShiftId)
			.map((a) => [a.employeeId, a.assignedShiftId])
	);

	const shiftDetails = await prisma.shift.findMany({
		where: { id: { in: Array.from(employeeShiftMap.values()) } },
	});

	const shiftDataMap = new Map();
	for (const s of shiftDetails) {
		let fullStart = dayjs.utc(s.fullShiftStartingTime).tz(TIMEZONE);
		let fullEnd = dayjs.utc(s.fullShiftEndingTime).tz(TIMEZONE);
		if (fullEnd.isBefore(fullStart)) fullEnd = fullEnd.add(1, "day");
		const fullDur = fullEnd.diff(fullStart, "minute");
		let halfStart = s.halfShiftStartingTime
			? dayjs.utc(s.halfShiftStartingTime).tz(TIMEZONE)
			: null;
		let halfEnd = s.halfShiftEndingTime
			? dayjs.utc(s.halfShiftEndingTime).tz(TIMEZONE)
			: null;
		if (halfEnd && halfStart && halfEnd.isBefore(halfStart))
			halfEnd = halfEnd.add(1, "day");
		const halfDur =
			halfStart && halfEnd
				? halfEnd.diff(halfStart, "minute")
				: Math.floor(fullDur / 2);
		shiftDataMap.set(s.id, {
			fullStart,
			fullEnd,
			fullDur,
			halfStart,
			halfEnd,
			halfDur,
			earlyFull: s.fullShiftEarlyPunchConsiderTimeInMinutes ?? 0,
			earlyHalf: s.halfShiftEarlyPunchConsiderTimeInMinutes ?? 0,
			graceInFull: s.fullShiftGraceInTimingInMinutes,
			graceInHalf:
				s.halfShiftGraceInTimingInMinutes ??
				s.fullShiftGraceInTimingInMinutes,
			graceOutFull: s.fullShiftGraceOutTimingInMinutes,
			graceOutHalf:
				s.halfShiftGraceOutTimingInMinutes ??
				s.fullShiftGraceOutTimingInMinutes,
			overtimeMax: s.overtimeMaximumAllowableLimitInMinutes ?? 0,
			postTol:
				s.maximumValidShiftLengthPostRegularEndingTimeInMinutes ?? 0,
			fullCutoff:
				s.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes ??
				0,
			halfCutoff:
				s.halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes ??
				s.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,
			floorFull: s.floorPercentageOfTotalFullShiftForHalfDay,
			ceilingFull: s.ceilingPercentageOfTotalFullShiftForHalfDay,
			floorHalf: s.floorPercentageOfTotalHalfShiftForHalfDay,
			ceilingHalf: s.ceilingPercentageOfTotalHalfShiftForHalfDay,
			weeklyOff: s.weeklyDaysOff,
			weeklyHalf: s.weeklyHalfDays,
		});
	}

	const upserts = [];

	for (const istDay of allDays) {
		const dayKey = istDay.format("YYYY-MM-DD");
		const monthKey = istDay.format("YYYY-MM");
		const dayName = istDay.format("dddd");

		for (const { employeeId: empId } of allEmployees) {
			const shiftId = employeeShiftMap.get(empId);
			if (!shiftId) continue;
			const sd = shiftDataMap.get(shiftId);
			if (!sd) continue;

			const leaveKey = `${empId}_${dayKey}`;
			const leaveType = leaveMap.get(leaveKey);

			let status = "absent";
			let flags = [];
			let pin = null,
				pout = null;
			
			if (leaveType && !["UNPAID", "LOP"].includes(leaveType)) {
				status = "approvedLeave";
				flags = ["approvedLeave"];

				upserts.push({
					employeeId: empId,
					attendanceDate: new Date(istDay.format("YYYY-MM-DD")),
					attendanceDay: dayName,
					punchIn: null,
					punchOut: null,
					flags,
					status,
				});
				continue;
			}

			const shiftHolidaySet = new Set(
				rawHolidays
					.filter((h) => !h.forShiftId || h.forShiftId === shiftId)
					.map((h) =>
						dayjs.utc(h.date).tz(TIMEZONE).format("YYYY-MM-DD")
					)
			);
			const isHoliday = shiftHolidaySet.has(dayKey);

			const isHalf = sd.weeklyHalf
				.map((d) => d.toLowerCase())
				.includes(dayName.toLowerCase());
			const baseStart =
				isHalf && sd.halfStart ? sd.halfStart : sd.fullStart;
			const baseEnd = isHalf && sd.halfEnd ? sd.halfEnd : sd.fullEnd;
			let schStart = istDay
				.hour(baseStart.hour())
				.minute(baseStart.minute())
				.second(baseStart.second());
			let schEnd = istDay
				.hour(baseEnd.hour())
				.minute(baseEnd.minute())
				.second(baseEnd.second());
			if (schEnd.isBefore(schStart)) schEnd = schEnd.add(1, "day");

			const rawShiftEnd = schEnd.clone();
			const dur = isHalf ? sd.halfDur : sd.fullDur;
			const halfMark = schStart.add(dur / 2, "minute");
			const postTolEnd = schEnd.add(sd.postTol, "minute");

			const rawDayLogs = logsMap.get(empId)?.get(dayKey) || [];
			const validLogs = rawDayLogs
				.map((l) => ({
					...l,
					timestamp: dayjs
						.utc(l.timestamp)
						.tz(TIMEZONE)
						.second(0)
						.millisecond(0),
				}))
				.filter((l) =>
					l.timestamp.isBetween(
						schStart.subtract(
							isHalf ? sd.earlyHalf : sd.earlyFull,
							"minute"
						),
						postTolEnd,
						null,
						"[]"
					)
				)
				.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());

			if (
				isHoliday ||
				sd.weeklyOff
					.map((d) => d.toLowerCase())
					.includes(dayName.toLowerCase())
			) {
				status = isHoliday ? "holiday" : "weeklyOff";
			} else if (validLogs.length > 0) {
				pin = dayjs.utc(validLogs[0].timestamp).tz(TIMEZONE);
				pout =
					validLogs.length > 1
						? dayjs.utc(validLogs.at(-1).timestamp).tz(TIMEZONE)
						: null;

				if (
					pin.isAfter(
						schStart.add(
							isHalf ? sd.halfCutoff : sd.fullCutoff,
							"minute"
						)
					)
				) {
					status = "absent";
					flags.push("firstPunchBeyondCutoff");
				} else if (validLogs.length === 1) {
					if (pin.isSameOrBefore(halfMark)) {
						status = "absent";
						flags = ["singleEntry", "autoOut"];
						pout = schEnd.clone();
					} else {
						status = "absent";
						flags = ["singleEntry"];
					}
				} else {
					const gi = schStart.add(
						isHalf ? sd.graceInHalf : sd.graceInFull,
						"minute"
					);
					const go = schEnd.subtract(
						isHalf ? sd.graceOutHalf : sd.graceOutFull,
						"minute"
					);

					const adjIn = pin.isSameOrBefore(gi) ? schStart : pin;

					if (pin.isAfter(gi)) flags.push("late");
					if (
						pout &&
						pout.isBefore(
							schEnd.subtract(
								isHalf ? sd.graceOutHalf : sd.graceOutFull,
								"minute"
							)
						)
					) {
						flags.push("earlyOut");
					}

					const worked = pout ? pout.diff(adjIn, "minute") : 0;
					if (pout && pout.isBefore(go)) flags.push("earlyOut");
					const floorMin =
						(isHalf ? sd.floorHalf : sd.floorFull) * dur;
					const ceilMin =
						(isHalf ? sd.ceilingHalf : sd.ceilingFull) * dur;

					if (worked < floorMin) {
						status = "absent";
						flags.push("insufficientHours");
					} else if (worked < ceilMin) {
						status = "halfDay";
					} else {
						status = "fullDay";
					}

					if (
						status === "fullDay" &&
						pout &&
						pout.isAfter(rawShiftEnd)
					) {
						const otMin = pout.diff(rawShiftEnd, "minute");
						const otHours = Math.floor(
							pout.diff(rawShiftEnd, "minute") / 60
						);

						if (otHours > 0 && otHours * 60 <= sd.overtimeMax) {
							status = "overtime";
							flags.push("overtime");
						} else if (otMin > sd.overtimeMax) {
							status = "anomalous";
							flags.push("suspicious", "invalidOut");
						} else {
							status = "absent";
							flags.push("invalidOut", "autoOut");
						}
					}
				}
			}

			const isLateToday = flags.includes("late");
			if (isLateToday) {
			const lateKey = `${empId}_${monthKey}`;
			const prev = monthlyLateCount.get(lateKey) ?? 0;
			const current = prev + 1;
			monthlyLateCount.set(lateKey, current);

			// Every 3rd late of the calendar month (3rd, 6th, 9th, ...)
			if (current % 3 === 0) {
				// Call processAttendanceStatuses with employeeId and attendance date
				await processAttendanceStatuses({
				employeeId: empId,
				date: new Date(istDay.format("YYYY-MM-DD")), // same as attendanceDate
				identifier: "thirdlate"
				});
			}
			}

			flags = Array.from(new Set(flags));

			upserts.push({
				employeeId: empId,
				attendanceDate: new Date(istDay.format("YYYY-MM-DD")),
				attendanceDay: dayName,
				punchIn: pin ? pin.utc().toDate() : null,
				punchOut: pout ? pout.utc().toDate() : null,
				durationInOfficeMinutes:
				pin && pout
					? Math.floor(pout.diff(pin, "second") / 60)
					: 0,
				flags,
				status,
			});
		}
	}

	await pMap(
		upserts,
		async (rec) => {
			const existing = await prisma.attendanceLog.findUnique({
				where: {
					employeeId_attendanceDate: {
						employeeId: rec.employeeId,
						attendanceDate: rec.attendanceDate,
					},
				},
				select: { flags: true },
			});

			const preserve =
				existing?.flags?.includes("manualEntry") ||
				existing?.flags?.includes("edited");
			if (preserve) return;

			return await prisma.attendanceLog.upsert({
				where: {
					employeeId_attendanceDate: {
						employeeId: rec.employeeId,
						attendanceDate: rec.attendanceDate,
					},
				},
				create: rec,
				update: rec,
			});
		},
		{ concurrency: CORES }
	);
}
