// src/biometric-access-machine/methods/makeEmployeeAttendance.js

import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import pMap from "p-map";
import { processAttendanceStatuses } from "./processAttendanceStatuses.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";
const ATTENDANCE_WRITE_CONCURRENCY = Number(
	process.env.ATTENDANCE_WRITE_CONCURRENCY || 4
);

function toAttendanceDate(istDay) {
	return new Date(istDay.format("YYYY-MM-DD"));
}

async function getAllDatesToProcess({ date, monthYear, year, istNow }) {
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

function buildDateContext(allDays) {
	const sorted = allDays.slice().sort((a, b) => a.valueOf() - b.valueOf());

	return {
		allDays,
		firstDay: sorted[0].startOf("day"),
		lastDay: sorted[sorted.length - 1].endOf("day"),
	};
}

async function loadEmployeeShiftScope(employeeId) {
	const allEmployees = employeeId
		? [{ employeeId }]
		: await prisma.employee.findMany({
				select: {
					employeeId: true,
				},
			});

	const assignments = await prisma.employeeDetails.findMany({
		where: {
			employeeId: {
				in: allEmployees.map((employee) => employee.employeeId),
			},
		},
		select: {
			employeeId: true,
			assignedShiftId: true,
		},
	});

	const employeeShiftMap = new Map(
		assignments
			.filter((assignment) => assignment.assignedShiftId)
			.map((assignment) => [
				assignment.employeeId,
				assignment.assignedShiftId,
			])
	);

	const relevantShiftIds = Array.from(new Set(employeeShiftMap.values()));

	return {
		allEmployees,
		employeeShiftMap,
		relevantShiftIds,
	};
}

function buildHolidayLookup(rawHolidays) {
	const globalHolidaySet = new Set();
	const shiftHolidayMap = new Map();

	for (const holiday of rawHolidays) {
		const holidayDayKey = dayjs
			.utc(holiday.date)
			.tz(TIMEZONE)
			.format("YYYY-MM-DD");

		if (!holiday.forShiftId) {
			globalHolidaySet.add(holidayDayKey);
			continue;
		}

		if (!shiftHolidayMap.has(holiday.forShiftId)) {
			shiftHolidayMap.set(holiday.forShiftId, new Set());
		}

		shiftHolidayMap.get(holiday.forShiftId).add(holidayDayKey);
	}

	return function isHolidayForShift(shiftId, dayKey) {
		return (
			globalHolidaySet.has(dayKey) ||
			(shiftHolidayMap.get(shiftId)?.has(dayKey) ?? false)
		);
	};
}

function buildLogsMap(rawLogs) {
	const logsMap = new Map();

	for (const log of rawLogs) {
		const emp = log.employeeId;

		const dayKey = dayjs
			.utc(log.timestamp)
			.tz(TIMEZONE)
			.format("YYYY-MM-DD");

		if (!logsMap.has(emp)) {
			logsMap.set(emp, new Map());
		}

		const employeeLogsByDay = logsMap.get(emp);

		if (!employeeLogsByDay.has(dayKey)) {
			employeeLogsByDay.set(dayKey, []);
		}

		employeeLogsByDay.get(dayKey).push(log);
	}

	return logsMap;
}

function buildLeaveMap(rawLeaves) {
	const leaveMap = new Map();

	for (const leave of rawLeaves) {
		const start = dayjs.utc(leave.fromDate).tz(TIMEZONE).startOf("day");
		const end = dayjs.utc(leave.toDate).tz(TIMEZONE).endOf("day");

		for (
			let d = start.clone();
			d.isSameOrBefore(end);
			d = d.add(1, "day")
		) {
			const key = `${leave.employeeId}_${d.format("YYYY-MM-DD")}`;
			leaveMap.set(key, leave.leaveType);
		}
	}

	return leaveMap;
}

function buildShiftDataMap(shiftDetails) {
	const shiftDataMap = new Map();

	for (const shift of shiftDetails) {
		let fullStart = dayjs.utc(shift.fullShiftStartingTime).tz(TIMEZONE);
		let fullEnd = dayjs.utc(shift.fullShiftEndingTime).tz(TIMEZONE);

		if (fullEnd.isBefore(fullStart)) {
			fullEnd = fullEnd.add(1, "day");
		}

		const fullDur = fullEnd.diff(fullStart, "minute");

		let halfStart = shift.halfShiftStartingTime
			? dayjs.utc(shift.halfShiftStartingTime).tz(TIMEZONE)
			: null;

		let halfEnd = shift.halfShiftEndingTime
			? dayjs.utc(shift.halfShiftEndingTime).tz(TIMEZONE)
			: null;

		if (halfEnd && halfStart && halfEnd.isBefore(halfStart)) {
			halfEnd = halfEnd.add(1, "day");
		}

		const halfDur =
			halfStart && halfEnd
				? halfEnd.diff(halfStart, "minute")
				: Math.floor(fullDur / 2);

		shiftDataMap.set(shift.id, {
			fullStart,
			fullEnd,
			fullDur,

			halfStart,
			halfEnd,
			halfDur,

			earlyFull: shift.fullShiftEarlyPunchConsiderTimeInMinutes ?? 0,
			earlyHalf: shift.halfShiftEarlyPunchConsiderTimeInMinutes ?? 0,

			graceInFull: shift.fullShiftGraceInTimingInMinutes,
			graceInHalf:
				shift.halfShiftGraceInTimingInMinutes ??
				shift.fullShiftGraceInTimingInMinutes,

			graceOutFull: shift.fullShiftGraceOutTimingInMinutes,
			graceOutHalf:
				shift.halfShiftGraceOutTimingInMinutes ??
				shift.fullShiftGraceOutTimingInMinutes,

			overtimeMax: shift.overtimeMaximumAllowableLimitInMinutes ?? 0,

			postTol:
				shift.maximumValidShiftLengthPostRegularEndingTimeInMinutes ?? 0,

			fullCutoff:
				shift.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes ??
				0,

			halfCutoff:
				shift.halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes ??
				shift.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,

			floorFull: shift.floorPercentageOfTotalFullShiftForHalfDay,
			ceilingFull: shift.ceilingPercentageOfTotalFullShiftForHalfDay,
			floorHalf: shift.floorPercentageOfTotalHalfShiftForHalfDay,
			ceilingHalf: shift.ceilingPercentageOfTotalHalfShiftForHalfDay,

			weeklyOffSet: new Set(
				shift.weeklyDaysOff.map((day) => day.toLowerCase())
			),
			weeklyHalfSet: new Set(
				shift.weeklyHalfDays.map((day) => day.toLowerCase())
			),
		});
	}

	return shiftDataMap;
}

function buildExistingAttendanceMap(existingAttendanceRows) {
	const existingAttendanceMap = new Map();

	for (const row of existingAttendanceRows) {
		const rowDayKey = dayjs.utc(row.attendanceDate).format("YYYY-MM-DD");
		existingAttendanceMap.set(`${row.employeeId}_${rowDayKey}`, row);
	}

	return existingAttendanceMap;
}

function computeAttendanceRecord({
	empId,
	istDay,
	dayKey,
	dayName,
	dayNameLower,
	employeeShiftMap,
	shiftDataMap,
	leaveMap,
	logsMap,
	isHolidayForShift,
}) {
	const shiftId = employeeShiftMap.get(empId);
	if (!shiftId) return null;

	const shift = shiftDataMap.get(shiftId);
	if (!shift) return null;

	const leaveKey = `${empId}_${dayKey}`;
	const leaveType = leaveMap.get(leaveKey);

	let status = "absent";
	let flags = [];

	let pin = null;
	let pout = null;

	if (leaveType && !["UNPAID", "LOP"].includes(leaveType)) {
		return {
			employeeId: empId,
			attendanceDate: toAttendanceDate(istDay),
			attendanceDay: dayName,
			punchIn: null,
			punchOut: null,
			flags: ["approvedLeave"],
			status: "approvedLeave",
		};
	}

	const isHoliday = isHolidayForShift(shiftId, dayKey);
	const isHalf = shift.weeklyHalfSet.has(dayNameLower);

	const baseStart =
		isHalf && shift.halfStart ? shift.halfStart : shift.fullStart;

	const baseEnd = isHalf && shift.halfEnd ? shift.halfEnd : shift.fullEnd;

	let schStart = istDay
		.hour(baseStart.hour())
		.minute(baseStart.minute())
		.second(baseStart.second());

	let schEnd = istDay
		.hour(baseEnd.hour())
		.minute(baseEnd.minute())
		.second(baseEnd.second());

	if (schEnd.isBefore(schStart)) {
		schEnd = schEnd.add(1, "day");
	}

	const rawShiftEnd = schEnd.clone();
	const dur = isHalf ? shift.halfDur : shift.fullDur;
	const halfMark = schStart.add(dur / 2, "minute");
	const postTolEnd = schEnd.add(shift.postTol, "minute");

	const rawDayLogs = logsMap.get(empId)?.get(dayKey) || [];

	const validLogs = rawDayLogs
		.map((log) => ({
			...log,
			timestamp: dayjs
				.utc(log.timestamp)
				.tz(TIMEZONE)
				.second(0)
				.millisecond(0),
		}))
		.filter((log) =>
			log.timestamp.isBetween(
				schStart.subtract(
					isHalf ? shift.earlyHalf : shift.earlyFull,
					"minute"
				),
				postTolEnd,
				null,
				"[]"
			)
		)
		.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());

	if (isHoliday || shift.weeklyOffSet.has(dayNameLower)) {
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
					isHalf ? shift.halfCutoff : shift.fullCutoff,
					"minute"
				)
			)
		) {
			status = "absent";
			flags.push("late", "firstPunchBeyondCutoff");
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
				isHalf ? shift.graceInHalf : shift.graceInFull,
				"minute"
			);

			const go = schEnd.subtract(
				isHalf ? shift.graceOutHalf : shift.graceOutFull,
				"minute"
			);

			const adjIn = pin.isSameOrBefore(gi) ? schStart : pin;

			if (pin.isAfter(gi)) {
				flags.push("late");
			}

			if (
				pout &&
				pout.isBefore(
					schEnd.subtract(
						isHalf ? shift.graceOutHalf : shift.graceOutFull,
						"minute"
					)
				)
			) {
				flags.push("earlyOut");
			}

			const worked = pout ? pout.diff(adjIn, "minute") : 0;

			if (pout && pout.isBefore(go)) {
				flags.push("earlyOut");
			}

			const floorMin =
				(isHalf ? shift.floorHalf : shift.floorFull) * dur;

			const ceilMin =
				(isHalf ? shift.ceilingHalf : shift.ceilingFull) * dur;

			if (worked < floorMin) {
				status = "absent";
				flags.push("insufficientHours");
			} else if (worked < ceilMin) {
				status = "halfDay";
			} else {
				status = "fullDay";
			}

			if (status === "fullDay" && pout && pout.isAfter(rawShiftEnd)) {
				const otMin = pout.diff(rawShiftEnd, "minute");

				if (otMin > 0 && otMin <= shift.overtimeMax) {
					status = "overtime";
					flags.push("overtime");
				} else if (otMin > shift.overtimeMax) {
					status = "anomalous";
					flags.push("suspicious", "invalidOut");
				} else {
					status = "absent";
					flags.push("invalidOut", "autoOut");
				}
			}
		}
	}

	flags = Array.from(new Set(flags));

	return {
		employeeId: empId,
		attendanceDate: toAttendanceDate(istDay),
		attendanceDay: dayName,
		punchIn: pin ? pin.utc().toDate() : null,
		punchOut: pout ? pout.utc().toDate() : null,
		durationInOfficeMinutes:
			pin && pout ? Math.floor(pout.diff(pin, "second") / 60) : 0,
		flags,
		status,
	};
}

async function fetchAttendanceInputs({
	employeeId,
	firstDay,
	lastDay,
	relevantShiftIds,
}) {
	return await Promise.all([
		prisma.biometricLog.findMany({
			where: {
				...(employeeId ? { employeeId } : {}),
				timestamp: {
					gte: firstDay.utc().toDate(),
					lte: lastDay.utc().toDate(),
				},
			},
			orderBy: {
				timestamp: "asc",
			},
		}),

		prisma.holiday.findMany({
			where: {
				date: {
					gte: firstDay.toDate(),
					lte: lastDay.toDate(),
				},
				isActive: true,
				OR: [
					{ forShiftId: null },
					{ forShiftId: { in: relevantShiftIds } },
				],
			},
			select: {
				date: true,
				forShiftId: true,
			},
		}),

		prisma.leave.findMany({
			where: {
				status: "approved",
				fromDate: {
					lte: lastDay.toDate(),
				},
				toDate: {
					gte: firstDay.toDate(),
				},
				...(employeeId ? { employeeId } : {}),
			},
			select: {
				employeeId: true,
				fromDate: true,
				toDate: true,
				leaveType: true,
			},
		}),

		prisma.shift.findMany({
			where: {
				id: {
					in: relevantShiftIds,
				},
			},
		}),
	]);
}

async function preserveManualAndUpsertAttendance(upserts) {
	if (!upserts.length) return;

	const upsertEmployeeIds = Array.from(
		new Set(upserts.map((record) => record.employeeId))
	);

	const sortedAttendanceDates = upserts
		.map((record) => record.attendanceDate)
		.sort((a, b) => a.getTime() - b.getTime());

	const firstAttendanceDate = sortedAttendanceDates[0];
	const lastAttendanceDate =
		sortedAttendanceDates[sortedAttendanceDates.length - 1];

	const existingAttendanceRows = await prisma.attendanceLog.findMany({
		where: {
			employeeId: {
				in: upsertEmployeeIds,
			},
			attendanceDate: {
				gte: firstAttendanceDate,
				lte: lastAttendanceDate,
			},
		},
		select: {
			employeeId: true,
			attendanceDate: true,
			flags: true,
		},
	});

	const existingAttendanceMap = buildExistingAttendanceMap(existingAttendanceRows);

	await pMap(
		upserts,
		async (record) => {
			const recordDayKey = dayjs
				.utc(record.attendanceDate)
				.format("YYYY-MM-DD");

			const existing = existingAttendanceMap.get(
				`${record.employeeId}_${recordDayKey}`
			);

			const existingFlags = Array.isArray(existing?.flags)
				? existing.flags
				: [];

			if (
				existingFlags.includes("manualEntry") ||
				existingFlags.includes("edited")
			) {
				return;
			}

			const hasThirdLate = existingFlags.includes("thirdLate");

			let penaltyFlagsToCarry = [];

			if (hasThirdLate) {
				penaltyFlagsToCarry = existingFlags.filter((flag) =>
					["thirdLate", "leaveDocked", "payDocked"].includes(flag)
				);
			}

			record.flags = Array.from(
				new Set([...(record.flags || []), ...penaltyFlagsToCarry])
			);

			return await prisma.attendanceLog.upsert({
				where: {
					employeeId_attendanceDate: {
						employeeId: record.employeeId,
						attendanceDate: record.attendanceDate,
					},
				},
				create: record,
				update: record,
			});
		},
		{
			concurrency: ATTENDANCE_WRITE_CONCURRENCY,
		}
	);
}

export async function makeEmployeeAttendance({
	employeeId = null,
	date = null,
	monthYear = null,
	year = null,
} = {}) {
	const istNow = dayjs().tz(TIMEZONE);

	const allDays = await getAllDatesToProcess({
		date,
		monthYear,
		year,
		istNow,
	});

	if (!allDays.length) return;

	const { firstDay, lastDay } = buildDateContext(allDays);

	const { allEmployees, employeeShiftMap, relevantShiftIds } =
		await loadEmployeeShiftScope(employeeId);

	const [rawLogs, rawHolidays, rawLeaves, shiftDetails] =
		await fetchAttendanceInputs({
			employeeId,
			firstDay,
			lastDay,
			relevantShiftIds,
		});

	const isHolidayForShift = buildHolidayLookup(rawHolidays);
	const logsMap = buildLogsMap(rawLogs);
	const leaveMap = buildLeaveMap(rawLeaves);
	const shiftDataMap = buildShiftDataMap(shiftDetails);

	const upserts = [];
	const monthlyLateCount = new Map();

	for (const istDay of allDays) {
		const dayKey = istDay.format("YYYY-MM-DD");
		const monthKey = istDay.format("YYYY-MM");
		const dayName = istDay.format("dddd");
		const dayNameLower = dayName.toLowerCase();

		for (const { employeeId: empId } of allEmployees) {
			const record = computeAttendanceRecord({
				empId,
				istDay,
				dayKey,
				dayName,
				dayNameLower,
				employeeShiftMap,
				shiftDataMap,
				leaveMap,
				logsMap,
				isHolidayForShift,
			});

			if (!record) continue;

			const isLateToday = record.flags.includes("late");

			if (isLateToday) {
				const lateKey = `${empId}_${monthKey}`;
				const previousLateCount = monthlyLateCount.get(lateKey) ?? 0;
				const currentLateCount = previousLateCount + 1;

				monthlyLateCount.set(lateKey, currentLateCount);

				if (currentLateCount % 3 === 0) {
					record.flags.push("thirdLate");

					await processAttendanceStatuses({
						employeeId: empId,
						date: toAttendanceDate(istDay),
						identifier: "thirdlate",
					});
				}
			}

			record.flags = Array.from(new Set(record.flags));

			upserts.push(record);
		}
	}

	if (!upserts.length) return;

	await preserveManualAndUpsertAttendance(upserts);
}