import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrCreateAShift({
	shiftName,
	weeklyDaysOff = [],
	weeklyHalfDays = [],
	fullShiftStartingTime,
	fullShiftEndingTime,
	halfShiftStartingTime = null,
	halfShiftEndingTime = null,
	fullShiftGraceInTimingInMinutes,
	halfShiftGraceInTimingInMinutes = null,
	fullShiftGraceOutTimingInMinutes,
	halfShiftGraceOutTimingInMinutes = null,
	fullShiftEarlyPunchConsiderTimeInMinutes,
	halfShiftEarlyPunchConsiderTimeInMinutes,
	fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,
	halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes = null,
	overtimeMaximumAllowableLimitInMinutes = null,
	maximumValidShiftLengthPostRegularEndingTimeInMinutes = null,
	floorPercentageOfTotalFullShiftForHalfDay,
	ceilingPercentageOfTotalFullShiftForHalfDay,
	floorPercentageOfTotalHalfShiftForHalfDay,
	ceilingPercentageOfTotalHalfShiftForHalfDay,
}) {
	if (
		!shiftName ||
		!fullShiftStartingTime ||
		!fullShiftEndingTime ||
		fullShiftGraceInTimingInMinutes == null ||
		fullShiftGraceOutTimingInMinutes == null ||
		fullShiftEarlyPunchConsiderTimeInMinutes == null ||
		halfShiftEarlyPunchConsiderTimeInMinutes == null ||
		fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes == null ||
		floorPercentageOfTotalFullShiftForHalfDay == null ||
		ceilingPercentageOfTotalFullShiftForHalfDay == null ||
		floorPercentageOfTotalHalfShiftForHalfDay == null ||
		ceilingPercentageOfTotalHalfShiftForHalfDay == null
	) {
		throw new Error("Missing required fields.");
	}

	const toUTC = (t) => dayjs.tz(t, TIMEZONE).utc().toDate();

	return await prisma.$transaction(async (tx) => {
		const existing = await tx.shift.findUnique({ where: { shiftName } });
		if (existing) throw new Error(`Shift "${shiftName}" already exists`);

		const newShift = await tx.shift.create({
			data: {
				shiftName,
				weeklyDaysOff,
				weeklyHalfDays,
				fullShiftStartingTime: toUTC(fullShiftStartingTime),
				fullShiftEndingTime: toUTC(fullShiftEndingTime),
				halfShiftStartingTime: halfShiftStartingTime
					? toUTC(halfShiftStartingTime)
					: null,
				halfShiftEndingTime: halfShiftEndingTime
					? toUTC(halfShiftEndingTime)
					: null,

				fullShiftGraceInTimingInMinutes,
				halfShiftGraceInTimingInMinutes,
				fullShiftGraceOutTimingInMinutes,
				halfShiftGraceOutTimingInMinutes,

				fullShiftEarlyPunchConsiderTimeInMinutes,
				halfShiftEarlyPunchConsiderTimeInMinutes,

				fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,
				halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,

				overtimeMaximumAllowableLimitInMinutes,
				maximumValidShiftLengthPostRegularEndingTimeInMinutes,

				floorPercentageOfTotalFullShiftForHalfDay,
				ceilingPercentageOfTotalFullShiftForHalfDay,
				floorPercentageOfTotalHalfShiftForHalfDay,
				ceilingPercentageOfTotalHalfShiftForHalfDay,
			},
		});

		return newShift;
	});
}
