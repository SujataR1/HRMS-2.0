import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import { sendHrEmailWithAttachments } from "../../mailer/methods/hrMailer.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

const formatStatus = (status) => {
	return (
		{
			fullDay: "Full Shift",
			halfDay: "Partial Shift (Minimum Hours Met)",
			overtime: "Overtime",
			absent: "Absent",
			approvedLeave: "Pre-approved leave",
			weeklyOff: "Weekly Off",
			holiday: "Holiday",
			anomalous: "Anomalous punches detected",
		}[status] || status
	);
};

const readableFlags = {
	autoOut: "Punch out missing — auto-adjusted to scheduled end",
	suspiciousIn: "Unusual or irregular punch-in detected",
	longShift: "Significantly long work duration recorded",
	incomplete: "Incomplete punch data (in/out missing)",
	cascadingBreak: "Break duration suggests cascading attendance gap",
	invalidOut: "Punch out beyond permissible post-tolerance window",
	late: "Arrived after grace-in time",
	edited: "Modified by HR/admin",
	manualEntry: "Attendance manually inserted",
	singleEntry: "Only one punch recorded (either in or out)",
	lateInHalfDay: "Punched in too late for even half-day eligibility",
	postSevenOut: "Potential overtime",
	insufficientHours: "Worked duration below threshold",
	earlyOut: "Left early even when grace considered",
	firstPunchBeyondCutoff: "First punch happened beyond allowable cutoff",
	overtime: "Overtime logged after full shift",
	suspicious: "Out-of-pattern activity detected",
	approvedLeave: "Pre-approved leave",
};

export async function adminGenerateAndSendMonthlyReports({
	authHeader,
	shiftIds = [],
	employeeIds = [],
	monthYear,
}) {
	if (!authHeader) throw new Error("authHeader is required");
	if (!monthYear) throw new Error("monthYear is required");

	const { hrId } = await verifyHrJWT(authHeader);
	const hr = await prisma.hr.findUnique({ where: { id: hrId } });
	if (!hr) throw new Error("HR account not found");

	const [month, year] = monthYear.split("-").map(Number);
	const start = dayjs.tz(`${year}-${month}-01`, TIMEZONE).startOf("month");
	const end = start.endOf("month");
	const monthName = start.format("MMMM");

	const outputDir = path.join(
		process.cwd(),
		"media",
		"attendance-reports",
		monthYear
	);
	if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

	const pdfPath = path.join(outputDir, `Attendance-of-${monthYear}.pdf`);
	const doc = new PDFDocument({ margin: 50, size: "A4" });
	doc.pipe(fs.createWriteStream(pdfPath));

	const colTitles = [
		"Date",
		"Day",
		"Punch In",
		"Punch Out",
		"Status",
		"Remarks",
	];
	const colWidths = [70, 70, 70, 70, 90, 140];
	const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
	const startX = (doc.page.width - totalTableWidth) / 2;
	const maxY = doc.page.height - 120;

	const employeeDetailsWithMatchingShifts =
		await prisma.employeeDetails.findMany({
			where:
				shiftIds.length > 0
					? {
							assignedShiftId: { in: shiftIds },
						}
					: undefined,
		});
	const shiftMatchedEmployeeIds = employeeDetailsWithMatchingShifts.map(
		(d) => d.employeeId
	);

	const employeesById = await prisma.employee.findMany({
		where:
			employeeIds.length > 0
				? {
						employeeId: { in: employeeIds },
					}
				: undefined,
	});

	const employeesByShift = await prisma.employee.findMany({
		where:
			shiftIds.length > 0
				? {
						employeeId: { in: shiftMatchedEmployeeIds },
					}
				: undefined,
	});

	let allEmployees;

	if (employeeIds.length === 0 && shiftIds.length === 0) {
		allEmployees = employeesById;
	} else if (employeeIds.length > 0 && shiftIds.length === 0) {
		allEmployees = employeesById;
	} else if (employeeIds.length === 0 && shiftIds.length > 0) {
		allEmployees = employeesByShift;
	} else {
		const seen = new Set();
		allEmployees = [...employeesById, ...employeesByShift].filter((emp) => {
			if (seen.has(emp.employeeId)) return false;
			seen.add(emp.employeeId);
			return true;
		});
	}

	const employeeDetailsMap = new Map();
	const allEmployeeDetails = await prisma.employeeDetails.findMany({
		where: {
			employeeId: { in: allEmployees.map((e) => e.employeeId) },
		},
	});
	allEmployeeDetails.forEach((d) => {
		employeeDetailsMap.set(d.employeeId, d);
	});

	const relevantShiftIds = Array.from(
		new Set(
			allEmployeeDetails.map((d) => d.assignedShiftId).filter(Boolean)
		)
	);

	const rawHolidays = await prisma.holiday.findMany({
		where: {
			date: {
				gte: start.toDate(),
				lte: end.toDate(),
			},
			isActive: true,
			OR: [
				{ forShiftId: null },
				{ forShiftId: { in: relevantShiftIds } },
			],
		},
		select: {
			date: true,
			name: true,
			forShiftId: true,
		},
	});

	const holidayMap = new Map();
	for (const h of rawHolidays) {
		const key = dayjs.utc(h.date).tz(TIMEZONE).format("YYYY-MM-DD");
		if (!holidayMap.has(key)) holidayMap.set(key, []);
		holidayMap.get(key).push({
			name: h.name,
			forShiftId: h.forShiftId,
		});
	}

	const logs = await prisma.attendanceLog.findMany({
		where: {
			employeeId: { in: allEmployees.map((e) => e.employeeId) },
			attendanceDate: {
				gte: start.startOf("day").toDate(),
				lte: end.endOf("day").toDate(),
			},
		},
		orderBy: [{ employeeId: "asc" }, { attendanceDate: "asc" }],
	});

	const logsByEmployee = logs.reduce((acc, log) => {
		if (!acc[log.employeeId]) acc[log.employeeId] = [];
		acc[log.employeeId].push(log);
		return acc;
	}, {});

	const shiftMap = new Map();

	if (allEmployees.length > 0) {
		const allShiftIds = Array.from(
			new Set(
				allEmployees
					.map(
						(e) =>
							employeeDetailsMap.get(e.employeeId)
								?.assignedShiftId
					)
					.filter(Boolean)
			)
		);

		const shifts = await prisma.shift.findMany({
			where: { id: { in: allShiftIds } },
		});

		const formatTime = (dt) => dayjs(dt).tz(TIMEZONE).format("hh:mm A");

		shifts.forEach((shift) => {
			const fullStart = formatTime(shift.fullShiftStartingTime);
			const fullEnd = formatTime(shift.fullShiftEndingTime);
			const nameWithTime = `${shift.shiftName} (${fullStart} - ${fullEnd})`;
			shiftMap.set(shift.id, nameWithTime);
		});
	}

	for (const emp of allEmployees) {
		const attendance = logsByEmployee[emp.employeeId] || [];
		const stats = {
			present: 0,
			absent: 0,
			weeklyOff: 0,
			late: 0,
			fullDay: 0,
			halfDay: 0,
			approvedLeave: 0,
			holiday: 0,
		};

		const rows = attendance.map((log) => {
			if (log.status === "absent") stats.absent++;
			else stats.present++;

			if (log.status === "halfDay") stats.halfDay++;
			if (log.status === "fullDay") stats.fullDay++;
			if (log.status === "approvedLeave") stats.approvedLeave++;
			if (log.status === "holiday") stats.holiday++;
			if (log.status === "weeklyOff") stats.weeklyOff++;
			if ((log.flags || []).includes("late")) stats.late++;

			return {
				date: dayjs
					.utc(log.attendanceDate)
					.tz(TIMEZONE)
					.format("DD.MM.YYYY"),
				day: log.attendanceDay,
				punchIn: log.punchIn
					? dayjs.utc(log.punchIn).tz(TIMEZONE).format("hh:mm a")
					: "-",
				punchOut: log.punchOut
					? dayjs.utc(log.punchOut).tz(TIMEZONE).format("hh:mm a")
					: "-",
				status: formatStatus(log.status),
				flags:
					log.flags.length > 0
						? log.flags.map((f) => readableFlags[f] || f).join("; ")
						: log.status === "holiday"
							? (() => {
									const dateKey = dayjs
										.utc(log.attendanceDate)
										.tz(TIMEZONE)
										.format("YYYY-MM-DD");
									const shiftId = employeeDetailsMap.get(
										emp.employeeId
									)?.assignedShiftId;
									const holidayNames = holidayMap
										.get(dateKey)
										?.filter(
											(h) =>
												h.forShiftId === null ||
												h.forShiftId === shiftId
										)
										.map((h) => h.name);
									return `Holiday for: ${
										holidayNames?.join(", ") || "Unknown"
									}`;
								})()
							: log.status === "approvedLeave"
								? readableFlags["approvedLeave"]
								: "",
			};
		});

		let currentRowY = 0;
		let isFirstPageForEmployee = true;

		function drawHeader() {
			doc.addPage();

			doc.fontSize(16)
				.font("Helvetica-Bold")
				.text(`Attendance Report – ${monthName} ${year}`, {
					align: "center",
				});

			doc.y += 10;

			doc.fontSize(12).font("Helvetica");
			doc.text(`Name: ${emp.name || "Unknown"}`);
			doc.text(`Employee ID: ${emp.employeeId}`);
			const details = employeeDetailsMap.get(emp.employeeId);
			const shiftId = details?.assignedShiftId;
			const shiftText = shiftMap.get(shiftId) || "Unassigned";
			doc.text(`Assigned Shift: ${shiftText}`);

			doc.y += 10;

			doc.fontSize(12).font("Helvetica-Bold");
			doc.text(
				isFirstPageForEmployee
					? "Attendance:"
					: "Attendance (contd...):"
			);

			const headerY = doc.y;
			colTitles.forEach((title, i) => {
				const x =
					startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
				doc.rect(x, headerY, colWidths[i], 35).fill("#f0f0f0").stroke();

				const textHeight = doc.heightOfString(title, {
					width: colWidths[i] - 10,
					font: "Helvetica-Bold",
					fontSize: 12,
				});
				const yOffset = headerY + (35 - textHeight) / 2;

				doc.fillColor("black")
					.font("Helvetica-Bold")
					.fontSize(12)
					.text(title, x + 5, yOffset, {
						width: colWidths[i] - 10,
						align: "center",
						lineBreak: false,
					});
			});
			currentRowY = headerY + 35;
			isFirstPageForEmployee = false;
		}

		drawHeader();

		for (const row of rows) {
			const rowData = [
				row.date,
				row.day,
				row.punchIn,
				row.punchOut,
				row.status,
				row.flags,
			];

			const rowHeight =
				Math.max(
					...rowData.map((text, j) =>
						doc.heightOfString(text, {
							width: colWidths[j] - 10,
							align: "center",
							font: "Helvetica",
							fontSize: 11,
						})
					)
				) + 12;

			if (currentRowY + rowHeight > maxY) drawHeader();

			rowData.forEach((text, j) => {
				const x =
					startX + colWidths.slice(0, j).reduce((a, b) => a + b, 0);
				const textHeight = doc.heightOfString(text, {
					width: colWidths[j] - 10,
					align: "center",
					font: "Helvetica",
					fontSize: 11,
				});
				const yOffset = currentRowY + 6;
				doc.rect(x, currentRowY, colWidths[j], rowHeight).stroke();
				doc.font("Helvetica")
					.fontSize(11)
					.fillColor("black")
					.text(text, x + 5, yOffset, {
						width: colWidths[j] - 10,
						align: "center",
					});
			});

			currentRowY += rowHeight;
			doc.y = currentRowY;
		}

		const totalCalendarDays = end.date();
		const totalWorkingDays = 30;
		const totalWorkingDaysPresent = totalWorkingDays - stats.absent;
		const totalPartialShifts = stats.halfDay;

		doc.x = startX;
		doc.moveDown(2);
		doc.font("Helvetica-Bold")
			.text("Summary:", { align: "left" })
			.moveDown(0.5);
		doc.font("Helvetica")
			.fontSize(12)
			.text(`• Total Calendar Days: ${totalCalendarDays}`)
			.text(`• Total Working Days: ${totalWorkingDays}`)
			.text(`• Total Weekly Off Days: ${stats.weeklyOff}`)
			.text(`• Total Holidays: ${stats.holiday}`)
			.text(`• Total Approved Leaves: ${stats.approvedLeave}`)
			.text(`• Total Days Absent: ${stats.absent}`)
			.text(`• Total Days Late: ${stats.late}`)
			.text(`• Total Days with Partial Shifts: ${totalPartialShifts}`)
			.text(`• Total Days Present: ${stats.present}`)
			.text(`• Total Working Days Present: ${totalWorkingDaysPresent}`);
	}

	doc.end();

	await sendHrEmailWithAttachments({
		to: hr.email,
		purpose: "monthlyAttendanceReports",
		payload: {
			monthYear,
			year: year.toString(),
			subject: `Monthly Attendance Reports – ${monthYear}`,
		},
		attachments: [pdfPath],
	});

	return {
		success: true,
		message: `Consolidated attendance report for ${monthYear} generated and sent to admin`,
	};
}
