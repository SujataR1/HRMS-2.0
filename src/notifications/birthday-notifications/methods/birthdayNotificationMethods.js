import { prisma } from "#src/db/prisma.js";
import { sendEmployeeMail } from "#src/employee/mailer/methods/employeeMailer.js";
import { sendHrMail } from "#src/hr/mailer/methods/hrMailer.js";
import { createAndBroadcastEmployeeNotification } from "#src/notifications/methods/notificationService.js";

const ACTIVE_EMPLOYMENT_STATUSES = ["EMPLOYED", "PROBATION"];

function getTodayParts(today = new Date()) {
	return {
		currentMonth: today.getMonth() + 1,
		currentDay: today.getDate(),
		currentYear: today.getFullYear(),
	};
}

function formatDate(date) {
	if (!date) return null;

	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	}).format(new Date(date));
}

function getYearsCompleted(startDate, today = new Date()) {
	if (!startDate) return 0;

	return today.getFullYear() - new Date(startDate).getFullYear();
}

function makeFailure({ failures, channel, recipientEmployeeId, recipientEmail, err }) {
	failures.push({
		channel,
		recipientEmployeeId: recipientEmployeeId || null,
		recipientEmail: recipientEmail || null,
		message: err?.message || "Unknown delivery failure",
	});
}

async function getBirthdayEmployees(today) {
	const { currentMonth, currentDay } = getTodayParts(today);

	return await prisma.$queryRaw`
		SELECT e."employeeId", e."name", e."assignedEmail", d."dateOfBirth" AS "eventDate"
		FROM "EmployeeDetails" d
		JOIN "Employee" e ON e."employeeId" = d."employeeId"
		WHERE d."dateOfBirth" IS NOT NULL
		  AND EXTRACT(MONTH FROM d."dateOfBirth") = ${currentMonth}
		  AND EXTRACT(DAY FROM d."dateOfBirth") = ${currentDay}
		  AND d."employmentStatus"::text IN (${ACTIVE_EMPLOYMENT_STATUSES[0]}, ${ACTIVE_EMPLOYMENT_STATUSES[1]})
		ORDER BY e."name" ASC
	`;
}

async function getWorkAnniversaryEmployees(today) {
	const { currentMonth, currentDay, currentYear } = getTodayParts(today);

	return await prisma.$queryRaw`
		SELECT e."employeeId", e."name", e."assignedEmail", d."dateOfJoining" AS "eventDate"
		FROM "EmployeeDetails" d
		JOIN "Employee" e ON e."employeeId" = d."employeeId"
		WHERE d."dateOfJoining" IS NOT NULL
		  AND EXTRACT(MONTH FROM d."dateOfJoining") = ${currentMonth}
		  AND EXTRACT(DAY FROM d."dateOfJoining") = ${currentDay}
		  AND EXTRACT(YEAR FROM d."dateOfJoining") < ${currentYear}
		  AND d."employmentStatus"::text IN (${ACTIVE_EMPLOYMENT_STATUSES[0]}, ${ACTIVE_EMPLOYMENT_STATUSES[1]})
		ORDER BY e."name" ASC
	`;
}

async function getHrRecipients() {
	return await prisma.hr.findMany({
		select: {
			id: true,
			employeeId: true,
			name: true,
			email: true,
		},
		orderBy: {
			name: "asc",
		},
	});
}

function getBirthdayPayload(employee) {
	return {
		employeePurpose: "birthday",
		employeeMailPurpose: "birthday",
		employeeTitle: "Happy Birthday",
		employeeBody: `Dear ${employee.name}, the HRMS team wishes you a fantastic birthday filled with happiness and success!`,
		employeeSubject: "Happy Birthday from HRMS",
		hrPurpose: "employee_birthday_hr_alert",
		hrMailPurpose: "employee-birthday-alert",
		hrTitle: "Employee Birthday Alert",
		hrBody: `Today is ${employee.name}'s birthday (${employee.employeeId}).`,
		hrSubject: `Birthday reminder: ${employee.name}`,
		category: "birthday",
	};
}

function getWorkAnniversaryPayload(employee, today) {
	const yearsCompleted = getYearsCompleted(employee.eventDate, today);
	const yearLabel = yearsCompleted === 1 ? "year" : "years";

	return {
		employeePurpose: "work_anniversary",
		employeeMailPurpose: "work-anniversary",
		employeeTitle: "Happy Work Anniversary",
		employeeBody: `Dear ${employee.name}, congratulations on completing ${yearsCompleted} ${yearLabel} with us. Thank you for being part of the team.`,
		employeeSubject: "Happy Work Anniversary from HRMS",
		hrPurpose: "employee_work_anniversary_hr_alert",
		hrMailPurpose: "employee-work-anniversary-alert",
		hrTitle: "Employee Work Anniversary Alert",
		hrBody: `${employee.name} (${employee.employeeId}) completes ${yearsCompleted} ${yearLabel} with the organization today.`,
		hrSubject: `Work anniversary reminder: ${employee.name}`,
		category: "work_anniversary",
		yearsCompleted,
		yearLabel,
	};
}

async function notifyEmployee({ employee, payload, result }) {
	await createAndBroadcastEmployeeNotification({
		employeeId: employee.employeeId,
		source: "system",
		purpose: payload.employeePurpose,
		title: payload.employeeTitle,
		body: payload.employeeBody,
		data: {
			category: payload.category,
			eventDate: formatDate(employee.eventDate),
			yearsCompleted: payload.yearsCompleted || null,
		},
		persist: true,
	});

	result.employeesNotifiedCount++;
}

async function emailEmployee({ employee, payload, today, result }) {
	await sendEmployeeMail({
		to: employee.assignedEmail,
		purpose: payload.employeeMailPurpose,
		payload: {
			subject: payload.employeeSubject,
			name: employee.name,
			eventDate: formatDate(employee.eventDate),
			yearsCompleted: payload.yearsCompleted || "",
			yearLabel: payload.yearLabel || "",
			currentDate: formatDate(today),
		},
		sendLiveNotification: false,
	});

	result.employeeEmailsSentCount++;
}

async function notifyHr({ hr, employee, payload, result }) {
	await createAndBroadcastEmployeeNotification({
		employeeId: hr.employeeId,
		source: "system",
		purpose: payload.hrPurpose,
		title: payload.hrTitle,
		body: payload.hrBody,
		data: {
			category: payload.category,
			targetEmployeeId: employee.employeeId,
			targetEmployeeName: employee.name,
			eventDate: formatDate(employee.eventDate),
			yearsCompleted: payload.yearsCompleted || null,
			hrRecipientId: hr.id,
		},
		persist: true,
	});

	result.hrsNotifiedCount++;
}

async function emailHr({ hr, employee, payload, today, result }) {
	await sendHrMail({
		to: hr.email,
		purpose: payload.hrMailPurpose,
		payload: {
			subject: payload.hrSubject,
			hrName: hr.name,
			employeeName: employee.name,
			employeeId: employee.employeeId,
			eventDate: formatDate(employee.eventDate),
			yearsCompleted: payload.yearsCompleted || "",
			yearLabel: payload.yearLabel || "",
			currentDate: formatDate(today),
		},
		sendLiveNotification: false,
	});

	result.hrEmailsSentCount++;
}

async function processMilestoneEmployees({
	employees,
	hrRecipients,
	getPayload,
	today,
	result,
	countKey,
}) {
	result[countKey] = employees.length;

	for (const employee of employees) {
		const payload = getPayload(employee, today);

		try {
			await notifyEmployee({ employee, payload, result });
		} catch (err) {
			makeFailure({
				failures: result.failures,
				channel: `${payload.category}:employee_notification`,
				recipientEmployeeId: employee.employeeId,
				recipientEmail: employee.assignedEmail,
				err,
			});
		}

		try {
			await emailEmployee({ employee, payload, today, result });
		} catch (err) {
			makeFailure({
				failures: result.failures,
				channel: `${payload.category}:employee_mail`,
				recipientEmployeeId: employee.employeeId,
				recipientEmail: employee.assignedEmail,
				err,
			});
		}

		for (const hr of hrRecipients) {
			try {
				await notifyHr({ hr, employee, payload, result });
			} catch (err) {
				makeFailure({
					failures: result.failures,
					channel: `${payload.category}:hr_notification`,
					recipientEmployeeId: hr.employeeId,
					recipientEmail: hr.email,
					err,
				});
			}

			try {
				await emailHr({ hr, employee, payload, today, result });
			} catch (err) {
				makeFailure({
					failures: result.failures,
					channel: `${payload.category}:hr_mail`,
					recipientEmployeeId: hr.employeeId,
					recipientEmail: hr.email,
					err,
				});
			}
		}
	}
}

export async function sendEmployeeMilestoneNotifications({ today = new Date() } = {}) {
	const [birthdayEmployees, workAnniversaryEmployees, hrRecipients] =
		await Promise.all([
			getBirthdayEmployees(today),
			getWorkAnniversaryEmployees(today),
			getHrRecipients(),
		]);

	const result = {
		birthdayEmployeesCount: 0,
		workAnniversaryEmployeesCount: 0,
		hrRecipientsCount: hrRecipients.length,
		employeesNotifiedCount: 0,
		hrsNotifiedCount: 0,
		employeeEmailsSentCount: 0,
		hrEmailsSentCount: 0,
		failures: [],
		processedAt: new Date().toISOString(),
	};

	await processMilestoneEmployees({
		employees: birthdayEmployees,
		hrRecipients,
		getPayload: getBirthdayPayload,
		today,
		result,
		countKey: "birthdayEmployeesCount",
	});

	await processMilestoneEmployees({
		employees: workAnniversaryEmployees,
		hrRecipients,
		getPayload: getWorkAnniversaryPayload,
		today,
		result,
		countKey: "workAnniversaryEmployeesCount",
	});

	result.failuresCount = result.failures.length;

	return result;
}

export async function sendBirthdayNotifications() {
	return await sendEmployeeMilestoneNotifications();
}
