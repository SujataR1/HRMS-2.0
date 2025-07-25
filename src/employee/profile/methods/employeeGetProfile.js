import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import dotenv from "dotenv";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

dotenv.config(); // Load env vars from .env

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

const prisma = new PrismaClient();

/**
 * Fetch full profile of authenticated employee.
 *
 * @param {string} authHeader - Bearer token
 * @returns {Promise<Object>} - Full employee profile
 */
export async function employeeGetProfile(authHeader) {
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throw new Error("Missing or invalid Authorization header");

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const employee = await prisma.employee.findUnique({
		where: { employeeId },
		select: {
			employeeId: true,
			name: true,
			assignedEmail: true,
			updatedAt: true,
		},
	});

	if (!employee) {
		throw new Error("Employee not found");
	}

	const details = await prisma.employeeDetails.findUnique({
		where: { employeeId },
	});

	if (!details) {
		throw new Error("Employee details not found");
	}

	return {
		...employee,
		personalEmail: details.personalEmail,
		isPersonalEmailVerified: details.isPersonalEmailVerified,
		employmentType: details.employmentType,
		employmentStatus: details.employmentStatus,
		dateOfJoining: details.dateOfJoining,
		confirmationDate: details.confirmationDate,
		phoneNumber: details.phoneNumber,
		emergencyContactNumber: details.emergencyContactNumber,
		presentAddress: details.presentAddress,
		permanentAddress: details.permanentAddress,
		aadhaarCardNumber: details.aadhaarCardNumber,
		panCardNumber: details.panCardNumber,
		bloodGroup: details.bloodGroup,
		medicalNotes: details.medicalNotes,
		highestEducationalQualification: details.highestEducationalQualification,
		designation: details.designation,
		department: details.department,
		bankName: details.bankName,
		bankAccountNumber: details.bankAccountNumber,
		ifsCode: details.ifsCode,
		// assignedShiftId: details.assignedShiftId,
		assignedShift: details.assignedShiftId
			? await (async () => {
					const shift = await prisma.shift.findUnique({
						where: { id: details.assignedShiftId },
					});
					if (!shift) return null;

					const fullStart = dayjs.utc(shift.fullShiftStartingTime).tz(TIMEZONE);
					const fullEnd = dayjs.utc(shift.fullShiftEndingTime).tz(TIMEZONE);
					const fullDuration = fullEnd.diff(fullStart, "minute");

					const halfStart = shift.halfShiftStartingTime
						? dayjs.utc(shift.halfShiftStartingTime).tz(TIMEZONE)
						: null;
					const halfEnd = shift.halfShiftEndingTime
						? dayjs.utc(shift.halfShiftEndingTime).tz(TIMEZONE)
						: null;
					const halfDuration =
						halfStart && halfEnd ? halfEnd.diff(halfStart, "minute") : null;

					const earlyInFrom = fullStart.subtract(
						shift.fullShiftEarlyPunchConsiderTimeInMinutes,
						"minute"
					);
					const graceInUntil = fullStart.add(
						shift.fullShiftGraceInTimingInMinutes,
						"minute"
					);
					const absentAfter = fullStart.add(
						shift.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,
						"minute"
					);
					const graceOutFrom = fullEnd.subtract(
						shift.fullShiftGraceOutTimingInMinutes,
						"minute"
					);
					const maxLeave = fullEnd.add(
						shift.maximumValidShiftLengthPostRegularEndingTimeInMinutes || 0,
						"minute"
					);

					const halfDayMinFull = Math.round(
						fullDuration * shift.floorPercentageOfTotalFullShiftForHalfDay
					);
					const halfDayMaxFull = Math.round(
						fullDuration * shift.ceilingPercentageOfTotalFullShiftForHalfDay
					);

					const halfDayMinFullTime = fullStart.add(halfDayMinFull, "minute");
					const halfDayMaxFullTime = fullStart.add(halfDayMaxFull, "minute");

					const halfDayMinHalf =
						halfDuration != null
							? Math.round(
									halfDuration * shift.floorPercentageOfTotalHalfShiftForHalfDay
							  )
							: null;
					const halfDayMaxHalf =
						halfDuration != null
							? Math.round(
									halfDuration * shift.ceilingPercentageOfTotalHalfShiftForHalfDay
							  )
							: null;

					const halfDayMinHalfTime =
						halfStart && halfDayMinHalf != null
							? halfStart.add(halfDayMinHalf, "minute")
							: null;
					const halfDayMaxHalfTime =
						halfStart && halfDayMaxHalf != null
							? halfStart.add(halfDayMaxHalf, "minute")
							: null;

					return {
						id: shift.id,
						shiftName: shift.shiftName,
						weeklyDaysOff: shift.weeklyDaysOff,
						weeklyHalfDays: shift.weeklyHalfDays,
						fullShiftStartingTime: fullStart.format("h:mm A"),
						fullShiftEndingTime: fullEnd.format("h:mm A"),
						fullShiftDuration: `${Math.floor(fullDuration / 60)}h ${
							fullDuration % 60
						}m`,
						halfShiftStartingTime: halfStart?.format("h:mm A") ?? null,
						halfShiftEndingTime: halfEnd?.format("h:mm A") ?? null,
						halfShiftDuration:
							halfDuration != null
								? `${Math.floor(halfDuration / 60)}h ${halfDuration % 60}m`
								: null,
						fullShiftEarlyPunchConsiderTimeInMinutes:
							shift.fullShiftEarlyPunchConsiderTimeInMinutes,
						halfShiftEarlyPunchConsiderTimeInMinutes:
							shift.halfShiftEarlyPunchConsiderTimeInMinutes,
						fullShiftGraceInTimingInMinutes:
							shift.fullShiftGraceInTimingInMinutes,
						fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes:
							shift.fullShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,
						halfShiftGraceInTimingInMinutes:
							shift.halfShiftGraceInTimingInMinutes,
						halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes:
							shift.halfShiftTimeForFirstPunchBeyondWhichMarkedAbsentInMinutes,
						fullShiftGraceOutTimingInMinutes:
							shift.fullShiftGraceOutTimingInMinutes,
						halfShiftGraceOutTimingInMinutes:
							shift.halfShiftGraceOutTimingInMinutes,
						overtimeMaximumAllowableLimitInMinutes:
							shift.overtimeMaximumAllowableLimitInMinutes,
						maximumValidShiftLengthPostRegularEndingTimeInMinutes:
							shift.maximumValidShiftLengthPostRegularEndingTimeInMinutes,
						floorPercentageOfTotalFullShiftForHalfDay:
							shift.floorPercentageOfTotalFullShiftForHalfDay,
						ceilingPercentageOfTotalFullShiftForHalfDay:
							shift.ceilingPercentageOfTotalFullShiftForHalfDay,
						floorPercentageOfTotalHalfShiftForHalfDay:
							shift.floorPercentageOfTotalHalfShiftForHalfDay,
						ceilingPercentageOfTotalHalfShiftForHalfDay:
							shift.ceilingPercentageOfTotalHalfShiftForHalfDay,
						computed: {
							punchInEarliest: earlyInFrom.format("h:mm A"),
							punchInGraceUntil: graceInUntil.format("h:mm A"),
							punchInAbsentAfter: absentAfter.format("h:mm A"),
							punchOutEarliestWithoutPenalty: graceOutFrom.format("h:mm A"),
							punchOutMaxLatestWithBuffer: maxLeave.format("h:mm A"),
							fullShiftHalfDayMinTime: halfDayMinFullTime.format("h:mm A"),
							fullShiftHalfDayMaxTime: halfDayMaxFullTime.format("h:mm A"),
							fullShiftHalfDayMinDuration: `${halfDayMinFull} mins`,
							fullShiftHalfDayMaxDuration: `${halfDayMaxFull} mins`,
							halfShiftHalfDayMinTime:
								halfDayMinHalfTime?.format("h:mm A") ?? null,
							halfShiftHalfDayMaxTime:
								halfDayMaxHalfTime?.format("h:mm A") ?? null,
							halfShiftHalfDayMinDuration:
								halfDayMinHalf != null ? `${halfDayMinHalf} mins` : null,
							halfShiftHalfDayMaxDuration:
								halfDayMaxHalf != null ? `${halfDayMaxHalf} mins` : null,
						},
					};
			  })()
			: null,
	};
}
