// processAttendanceStatuses.js
import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function processAttendanceStatuses({ employeeId, date, identifier }) {
	if (!employeeId || !date || !identifier) {
		throw new Error("processAttendanceStatuses: employeeId, date, identifier are required");
	}

	// EXACTLY match what makeEmployeeAttendance writes as attendanceDate
	const attendanceDate =
		date instanceof Date ? date : new Date(date);

	const attendance = await prisma.attendanceLog.findUnique({
		where: {
			employeeId_attendanceDate: {
				employeeId,
				attendanceDate,
			},
		},
	});

	if (!attendance) return;

	switch (identifier) {
		case "thirdlate":
			await handleThirdLate({ attendance, employeeId, attendanceDate });
			break;

		default:
			console.warn("Unknown identifier", identifier);
	}
}

async function handleThirdLate({ attendance, employeeId, attendanceDate }) {
	// Respect manually edited attendance
	if (
		attendance.flags?.includes("manualEntry") ||
		attendance.flags?.includes("edited")
	) {
		return;
	}

	await prisma.$transaction(async (tx) => {
		// 1) Get leave register for this employee
		const leaveReg = await tx.leaveRegister.findUnique({
			where: { employeeId },
		});

		let flags = Array.isArray(attendance.flags)
			? [...attendance.flags]
			: [];

		// Make sure thirdLate is present
		if (!flags.includes("thirdLate")) {
			flags.push("thirdLate");
		}

		let note;
		let leaveDocked = false;

		// 2) If casual leave available, dock 1; else dock pay
		if (leaveReg && leaveReg.casualCurrent > 0) {
			// Dock one casual leave
			await tx.leaveRegister.update({
				where: { employeeId },
				data: {
					casualCurrent: { decrement: 1 },
				},
			});
			leaveDocked = true;
			if (!flags.includes("leaveDocked")) {
				flags.push("leaveDocked");
			}
			note =
				"Third late of triplet in a single month. A paid casual leave has been docked.";
		} else {
			// No casual leave → dock pay
			if (!flags.includes("payDocked")) {
				flags.push("payDocked");
			}
			note =
				"Third late of triplet in a single month. A day's pay has been docked as no paid leaves were available.";
		}

		// 3) Merge comments with the specific note (leave or pay)
		const comments = attendance.comments
			? attendance.comments.trim() + " | " + note
			: note;

		flags = Array.from(new Set(flags));

		// 4) Update the attendance record with flags + comment
		await tx.attendanceLog.update({
			where: {
				employeeId_attendanceDate: { employeeId, attendanceDate },
			},
			data: {
				flags,
				comments,
			},
		});
	});
}
