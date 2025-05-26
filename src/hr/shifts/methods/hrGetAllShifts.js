import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
				fullShiftGraceOutTiminingInMinutes: true,
				halfShiftGraceOutTimingInMinutes: true,

				fullShiftEarlyPunchConsiderTimeInMinutes: true,
				halfShiftEarlyPunchConsiderTimeInMinutes: true,

				overtimeMaximumAllowableLimitInMinutes: true,
				maximumValidShiftLengthPostRegularEndingTimeInMinutes: true,

				floorPercentageOfTotalFullShiftForHalfDay: true,
				ceilingPercentageOfTotalFullShiftForHalfDay: true,
				floorPercentageOfTotalHalfShiftForHalfDay: true,
				ceilingPercentageOfTotalHalfShiftForHalfDay: true,
			},
		});
		return shifts;
	});
}
