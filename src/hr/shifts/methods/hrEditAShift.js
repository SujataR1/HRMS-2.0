import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { hrNotifyEmployeesShiftUpdated } from "../../../employee/mailer/methods/hrNotifyEmployeesShiftUpdated.js"

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrEditAShift(input) {
	const {
		shiftId,
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
	} = input;

	if (!shiftId) throw new Error("Missing required field: shiftId");

	const toUTC = (t) => dayjs.tz(t, TIMEZONE).utc().toDate();

	return await prisma.$transaction(async (tx) => {
		const existing = await tx.shift.findUnique({ where: { id: shiftId } });
		if (!existing) throw new Error("Shift not found");

		// If shiftName changes, ensure uniqueness (DB will also enforce @unique, but we keep error clean)
		if (shiftName !== existing.shiftName) {
			const nameTaken = await tx.shift.findUnique({ where: { shiftName } });
			if (nameTaken) throw new Error(`Shift "${shiftName}" already exists`);
		}

		const updated = await tx.shift.update({
			where: { id: shiftId },
			data: {
				shiftName,
				weeklyDaysOff,
				weeklyHalfDays,

				fullShiftStartingTime: toUTC(fullShiftStartingTime),
				fullShiftEndingTime: toUTC(fullShiftEndingTime),
				halfShiftStartingTime: halfShiftStartingTime ? toUTC(halfShiftStartingTime) : null,
				halfShiftEndingTime: halfShiftEndingTime ? toUTC(halfShiftEndingTime) : null,

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

        try {
            await hrNotifyEmployeesShiftUpdated({ shiftId: updatedShift.id });
        } catch (err) {
            // Best-effort: do NOT fail shift edit because SMTP/template failed
            console.error("Shift updated, but employee notification failed:", err);
        }
		return updated;
	});
}
