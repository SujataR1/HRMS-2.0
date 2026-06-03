import { prisma } from "#src/db/prisma.js";

export async function hrGetAllShifts() {
	return await prisma.$transaction(async (tx) => {
		const shifts = await tx.shift.findMany({
			select: {
				id: true,
				shiftName: true,
				weeklyDaysOff: true,
				weeklyHalfDays: true,

				fullShiftStartingTime: true,
				fullShiftEndingTime: true,
				halfShiftStartingTime: true,
				halfShiftEndingTime: true,

				fullShiftGraceInTimingInMinutes: true,
				halfShiftGraceInTimingInMinutes: true,
				fullShiftGraceOutTimingInMinutes: true,
				halfShiftGraceOutTimingInMinutes: true,

				fullShiftEarlyPunchConsiderTimeInMinutes: true,
				halfShiftEarlyPunchConsiderTimeInMinutes: true,

				fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes: true,
				halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes: true,

				overtimeMaximumAllowableLimitInMinutes: true,
				maximumValidShiftLengthPostRegularEndingTimeInMinutes: true,

				floorPercentageOfTotalFullShiftForHalfDay: true,
				ceilingPercentageOfTotalFullShiftForHalfDay: true,
				floorPercentageOfTotalHalfShiftForHalfDay: true,
				ceilingPercentageOfTotalHalfShiftForHalfDay: true,

				breakPolicy: true,
			},
			orderBy: {
				shiftName: "asc",
			},
		});

		return shifts;
	});
}