import { z } from "zod";

const dateField = z.preprocess(
	(val) =>
		typeof val === "string" || val instanceof Date ? new Date(val) : undefined,
	z.date()
);

export const hrEditAShiftSchema = z.object({
	shiftId: z.string().min(1),

	// full overwrite (same as create)
	shiftName: z.string().min(1),
	weeklyDaysOff: z.array(z.string()).default([]),
	weeklyHalfDays: z.array(z.string()).default([]),

	fullShiftEarlyPunchConsiderTimeInMinutes: z.number().int().nonnegative(),
	halfShiftEarlyPunchConsiderTimeInMinutes: z.number().int().nonnegative(),

	fullShiftStartingTime: dateField,
	fullShiftEndingTime: dateField,
	halfShiftStartingTime: dateField.nullable().optional(),
	halfShiftEndingTime: dateField.nullable().optional(),

	fullShiftGraceInTimingInMinutes: z.number().int().nonnegative(),
	halfShiftGraceInTimingInMinutes: z.number().int().nonnegative().nullable().optional(),

	fullShiftGraceOutTimingInMinutes: z.number().int().nonnegative(),
	halfShiftGraceOutTimingInMinutes: z.number().int().nonnegative().nullable().optional(),

	fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes: z
		.number()
		.int()
		.nonnegative(),
	halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes: z
		.number()
		.int()
		.nonnegative()
		.nullable()
		.optional(),

	overtimeMaximumAllowableLimitInMinutes: z.number().int().positive().nullable().optional(),
	maximumValidShiftLengthPostRegularEndingTimeInMinutes: z
		.number()
		.int()
		.positive()
		.nullable()
		.optional(),

	floorPercentageOfTotalFullShiftForHalfDay: z.number().min(0).max(1),
	ceilingPercentageOfTotalFullShiftForHalfDay: z.number().min(0).max(1),

	floorPercentageOfTotalHalfShiftForHalfDay: z.number().min(0).max(1),
	ceilingPercentageOfTotalHalfShiftForHalfDay: z.number().min(0).max(1),
});
