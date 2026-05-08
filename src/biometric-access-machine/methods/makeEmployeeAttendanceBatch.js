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
function readPositiveIntEnv(name, fallback, { min = 1, max = 10 } = {}) {
	const value = Number(process.env[name]);

	if (!Number.isInteger(value)) return fallback;
	if (value < min) return fallback;
	if (value > max) return max;

	return value;
}

const ATTENDANCE_WRITE_CONCURRENCY = readPositiveIntEnv(
	"ATTENDANCE_WRITE_CONCURRENCY",
	4,
	{ min: 1, max: 10 }
);

function normalizeEmployeeDays(employeeDays) {
	const unique = new Map();

	for (const item of employeeDays || []) {
		const employeeId = String(item?.employeeId || "").trim();
		const date = item?.date;

		if (!employeeId || !date) continue;

		const day = dayjs.tz(date, TIMEZONE).startOf("day");
		if (!day.isValid()) continue;

		const dayKey = day.format("YYYY-MM-DD");
		const key = `${employeeId}_${dayKey}`;

		if (!unique.has(key)) {
			unique.set(key, {
				employeeId,
				day,
				dayKey,
			});
		}
	}

	return Array.from(unique.values()).sort((a, b) => {
		const byDay = a.day.valueOf() - b.day.valueOf();
		if (byDay !== 0) return byDay;
		return a.employeeId.localeCompare(b.employeeId);
	});
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

		if (!logsMap.has(emp)) logsMap.set(emp, new Map());

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

	for (const s of shiftDetails) {
		let fullStart = dayjs.utc(s.fullShiftStartingTime).tz(TIMEZONE);
		let fullEnd = dayjs.utc(s.fullShiftEndingTime).tz(TIMEZONE);

		if (fullEnd.isBefore(fullStart)) {
			fullEnd = fullEnd.add(1, "day");
		}

		const fullDur = fullEnd.diff(fullStart, "minute");

		let halfStart = s.halfShiftStartingTime
			? dayjs.utc(s.halfShiftStartingTime).tz(TIMEZONE)
			: null;

		let halfEnd = s.halfShiftEndingTime
			? dayjs.utc(s.halfShiftEndingTime).tz(TIMEZONE)
			: null;

		if (halfEnd && halfStart && halfEnd.isBefore(halfStart)) {
			halfEnd = halfEnd.add(1, "day");
		}

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
				s.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes ?? 0,

			halfCutoff:
				s.halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes ??
				s.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,

			floorFull: s.floorPercentageOfTotalFullShiftForHalfDay,
			ceilingFull: s.ceilingPercentageOfTotalFullShiftForHalfDay,
			floorHalf: s.floorPercentageOfTotalHalfShiftForHalfDay,
			ceilingHalf: s.ceilingPercentageOfTotalHalfShiftForHalfDay,

			weeklyOffSet: new Set(
				(s.weeklyDaysOff || []).map((d) => d.toLowerCase())
			),
			weeklyHalfSet: new Set(
				(s.weeklyHalfDays || []).map((d) => d.toLowerCase())
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

function buildMonthlyLateCountMap(existingAttendanceRows, records) {
	const monthlyLateCount = new Map();
	const rowsByEmployeeMonth = new Map();

	for (const row of existingAttendanceRows) {
		const day = dayjs.utc(row.attendanceDate).tz(TIMEZONE);
		const monthKey = day.format("YYYY-MM");
		const key = `${row.employeeId}_${monthKey}`;

		if (!rowsByEmployeeMonth.has(key)) {
			rowsByEmployeeMonth.set(key, []);
		}

		rowsByEmployeeMonth.get(key).push({
			employeeId: row.employeeId,
			dayKey: day.format("YYYY-MM-DD"),
			attendanceDate: row.attendanceDate,
			flags: Array.isArray(row.flags) ? row.flags : [],
		});
	}

	for (const rec of records) {
		const day = dayjs.utc(rec.attendanceDate).tz(TIMEZONE);
		const monthKey = day.format("YYYY-MM");
		const key = `${rec.employeeId}_${monthKey}`;

		if (!rowsByEmployeeMonth.has(key)) {
			rowsByEmployeeMonth.set(key, []);
		}

		const dayKey = day.format("YYYY-MM-DD");
		const monthRows = rowsByEmployeeMonth.get(key);
		const existingIndex = monthRows.findIndex((row) => row.dayKey === dayKey);

		const replacement = {
			employeeId: rec.employeeId,
			dayKey,
			attendanceDate: rec.attendanceDate,
			flags: Array.isArray(rec.flags) ? rec.flags : [],
		};

		if (existingIndex >= 0) {
			monthRows[existingIndex] = replacement;
		} else {
			monthRows.push(replacement);
		}
	}

	for (const [key, rows] of rowsByEmployeeMonth.entries()) {
		const lateRows = rows
			.filter((row) => row.flags.includes("late"))
			.sort((a, b) => {
				const byDate =
					new Date(a.attendanceDate).getTime() -
					new Date(b.attendanceDate).getTime();

				if (byDate !== 0) return byDate;

				return a.dayKey.localeCompare(b.dayKey);
			});

		monthlyLateCount.set(
			key,
			new Map(
				lateRows.map((row, index) => [
					row.dayKey,
					{
						count: index + 1,
						isThirdLate: (index + 1) % 3 === 0,
					},
				])
			)
		);
	}

	return monthlyLateCount;
}

function applyThirdLateFlags({ records, existingAttendanceRows }) {
	const monthlyLateCount = buildMonthlyLateCountMap(
		existingAttendanceRows,
		records
	);

	const thirdLateRecords = [];

	for (const rec of records) {
		const day = dayjs.utc(rec.attendanceDate).tz(TIMEZONE);
		const monthKey = day.format("YYYY-MM");
		const dayKey = day.format("YYYY-MM-DD");
		const lateKey = `${rec.employeeId}_${monthKey}`;

		const lateInfo = monthlyLateCount.get(lateKey)?.get(dayKey);

		if (!lateInfo?.isThirdLate) continue;

		rec.flags = Array.from(new Set([...(rec.flags || []), "thirdLate"]));
		thirdLateRecords.push(rec);
	}

	return thirdLateRecords;
}

function computeAttendanceRecord({
	employeeId,
	istDay,
	dayKey,
	employeeShiftMap,
	shiftDataMap,
	logsMap,
	leaveMap,
	isHolidayForShift,
}) {
	const shiftId = employeeShiftMap.get(employeeId);
	if (!shiftId) return null;

	const sd = shiftDataMap.get(shiftId);
	if (!sd) return null;

	const dayName = istDay.format("dddd");
	const dayNameLower = dayName.toLowerCase();

	const leaveKey = `${employeeId}_${dayKey}`;
	const leaveType = leaveMap.get(leaveKey);

	let status = "absent";
	let flags = [];

	let pin = null;
	let pout = null;

	if (leaveType && !["UNPAID", "LOP"].includes(leaveType)) {
		return {
			employeeId,
			attendanceDate: new Date(istDay.format("YYYY-MM-DD")),
			attendanceDay: dayName,
			punchIn: null,
			punchOut: null,
			durationInOfficeMinutes: 0,
			flags: ["approvedLeave"],
			status: "approvedLeave",
		};
	}

	const isHoliday = isHolidayForShift(shiftId, dayKey);
	const isHalf = sd.weeklyHalfSet.has(dayNameLower);

	const baseStart = isHalf && sd.halfStart ? sd.halfStart : sd.fullStart;
	const baseEnd = isHalf && sd.halfEnd ? sd.halfEnd : sd.fullEnd;

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
	const dur = isHalf ? sd.halfDur : sd.fullDur;
	const halfMark = schStart.add(dur / 2, "minute");
	const postTolEnd = schEnd.add(sd.postTol, "minute");

	const rawDayLogs = logsMap.get(employeeId)?.get(dayKey) || [];

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
				schStart.subtract(isHalf ? sd.earlyHalf : sd.earlyFull, "minute"),
				postTolEnd,
				null,
				"[]"
			)
		)
		.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());

	if (isHoliday || sd.weeklyOffSet.has(dayNameLower)) {
		status = isHoliday ? "holiday" : "weeklyOff";
	} else if (validLogs.length > 0) {
		pin = dayjs.utc(validLogs[0].timestamp).tz(TIMEZONE);

		pout =
			validLogs.length > 1
				? dayjs.utc(validLogs.at(-1).timestamp).tz(TIMEZONE)
				: null;

		if (
			pin.isAfter(
				schStart.add(isHalf ? sd.halfCutoff : sd.fullCutoff, "minute")
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
				isHalf ? sd.graceInHalf : sd.graceInFull,
				"minute"
			);

			const go = schEnd.subtract(
				isHalf ? sd.graceOutHalf : sd.graceOutFull,
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
						isHalf ? sd.graceOutHalf : sd.graceOutFull,
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

			const floorMin = (isHalf ? sd.floorHalf : sd.floorFull) * dur;
			const ceilMin = (isHalf ? sd.ceilingHalf : sd.ceilingFull) * dur;

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

				if (otMin > 0 && otMin <= sd.overtimeMax) {
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

	flags = Array.from(new Set(flags));

	return {
		employeeId,
		attendanceDate: new Date(istDay.format("YYYY-MM-DD")),
		attendanceDay: dayName,
		punchIn: pin ? pin.utc().toDate() : null,
		punchOut: pout ? pout.utc().toDate() : null,
		durationInOfficeMinutes:
			pin && pout ? Math.floor(pout.diff(pin, "second") / 60) : 0,
		flags,
		status,
	};
}

/**
 * Batch attendance recomputation for explicit employee-day pairs.
 *
 * This is intentionally separate from makeEmployeeAttendance.js so existing
 * manual/admin/HR refresh behavior remains untouched.
 *
 * @param {{
 *   employeeDays: Array<{ employeeId: string, date: string | Date }>
 * }} input
 */
export async function makeEmployeeAttendanceBatch({ employeeDays = [] } = {}) {
	const normalizedEmployeeDays = normalizeEmployeeDays(employeeDays);

	if (!normalizedEmployeeDays.length) {
		return {
			processed: 0,
			upserted: 0,
			skippedManual: 0,
		};
	}

	const employeeIds = Array.from(
		new Set(normalizedEmployeeDays.map((item) => item.employeeId))
	);

	const firstDay = normalizedEmployeeDays[0].day.startOf("day");
	const lastDay =
		normalizedEmployeeDays[normalizedEmployeeDays.length - 1].day.endOf("day");

	const assignments = await prisma.employeeDetails.findMany({
		where: {
			employeeId: {
				in: employeeIds,
			},
		},
		select: {
			employeeId: true,
			assignedShiftId: true,
		},
	});

	const employeeShiftMap = new Map(
		assignments
			.filter((a) => a.assignedShiftId)
			.map((a) => [a.employeeId, a.assignedShiftId])
	);

	const relevantShiftIds = Array.from(new Set(employeeShiftMap.values()));

	const [rawLogs, rawHolidays, rawLeaves, shiftDetails] = await Promise.all([
		prisma.biometricLog.findMany({
			where: {
				employeeId: {
					in: employeeIds,
				},
				timestamp: {
					gte: firstDay.utc().toDate(),
					lte: lastDay.utc().toDate(),
				},
			},
			select: {
				employeeId: true,
				timestamp: true,
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
				employeeId: {
					in: employeeIds,
				},
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

	const isHolidayForShift = buildHolidayLookup(rawHolidays);
	const logsMap = buildLogsMap(rawLogs);
	const leaveMap = buildLeaveMap(rawLeaves);
	const shiftDataMap = buildShiftDataMap(shiftDetails);

	const records = [];

	for (const item of normalizedEmployeeDays) {
		const record = computeAttendanceRecord({
			employeeId: item.employeeId,
			istDay: item.day,
			dayKey: item.dayKey,
			employeeShiftMap,
			shiftDataMap,
			logsMap,
			leaveMap,
			isHolidayForShift,
		});

		if (record) {
			records.push(record);
		}
	}

	if (!records.length) {
		return {
			processed: normalizedEmployeeDays.length,
			upserted: 0,
			skippedManual: 0,
		};
	}

	const firstAffectedMonth = firstDay.startOf("month");
	const lastAffectedMonth = lastDay.endOf("month");

	const existingAttendanceRows = await prisma.attendanceLog.findMany({
		where: {
			employeeId: {
				in: employeeIds,
			},
			attendanceDate: {
				gte: firstAffectedMonth.toDate(),
				lte: lastAffectedMonth.toDate(),
			},
		},
		select: {
			employeeId: true,
			attendanceDate: true,
			flags: true,
		},
	});

	const existingAttendanceMap = buildExistingAttendanceMap(existingAttendanceRows);
	const thirdLateRecords = applyThirdLateFlags({
		records,
		existingAttendanceRows,
	});

	let upserted = 0;
	let skippedManual = 0;
	const upsertedThirdLateKeys = new Set();

	await pMap(
		records,
		async (rec) => {
			const recDayKey = dayjs.utc(rec.attendanceDate).format("YYYY-MM-DD");
			const recordKey = `${rec.employeeId}_${recDayKey}`;

			const existing = existingAttendanceMap.get(recordKey);

			const existingFlags = Array.isArray(existing?.flags)
				? existing.flags
				: [];

			if (
				existingFlags.includes("manualEntry") ||
				existingFlags.includes("edited")
			) {
				skippedManual += 1;
				return;
			}

			const hasThirdLate = existingFlags.includes("thirdLate");

			let penaltyFlagsToCarry = [];

			if (hasThirdLate) {
				penaltyFlagsToCarry = existingFlags.filter((f) =>
					["thirdLate", "leaveDocked", "payDocked"].includes(f)
				);
			}

			rec.flags = Array.from(
				new Set([...(rec.flags || []), ...penaltyFlagsToCarry])
			);

			await prisma.attendanceLog.upsert({
				where: {
					employeeId_attendanceDate: {
						employeeId: rec.employeeId,
						attendanceDate: rec.attendanceDate,
					},
				},
				create: rec,
				update: rec,
			});

			if ((rec.flags || []).includes("thirdLate")) {
				upsertedThirdLateKeys.add(recordKey);
			}

			upserted += 1;
		},
		{
			concurrency: ATTENDANCE_WRITE_CONCURRENCY,
		}
	);

	for (const rec of thirdLateRecords) {
		const recDayKey = dayjs.utc(rec.attendanceDate).format("YYYY-MM-DD");
		const recordKey = `${rec.employeeId}_${recDayKey}`;

		if (!upsertedThirdLateKeys.has(recordKey)) continue;

		await processAttendanceStatuses({
			employeeId: rec.employeeId,
			date: rec.attendanceDate,
			identifier: "thirdlate",
		});
	}

	return {
		processed: normalizedEmployeeDays.length,
		upserted,
		skippedManual,
	};
}