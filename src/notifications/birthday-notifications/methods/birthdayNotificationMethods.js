import { prisma } from "#src/db/prisma.js";
import { createAndBroadcastEmployeeNotification } from "#src/notifications/methods/notificationService.js";

/**
 * Finds all employees whose birthday falls on the current calendar day and month.
 */
export async function sendBirthdayNotifications() {
	const today = new Date();
	const currentMonth = today.getMonth() + 1; // JavaScript months are 0-11
	const currentDay = today.getDate();

	// 1. Fetch all active employee IDs matching month and day
	const matchingDetails = await prisma.$queryRaw`
		SELECT "employeeId" FROM "EmployeeDetails" 
		WHERE EXTRACT(MONTH FROM "dateOfBirth") = ${currentMonth}
		  AND EXTRACT(DAY FROM "dateOfBirth") = ${currentDay}
	`;

	if (!matchingDetails || matchingDetails.length === 0) {
		return {
			employeesNotifiedCount: 0,
			adminsNotifiedCount: 0,
			processedAt: new Date().toISOString(),
		};
	}

	const employeeIds = matchingDetails.map(d => d.employeeId);

	// 2. Fetch all system administrators
	const admins = await prisma.admin.findMany({
		select: { id: true, name: true }
	});

	let employeesNotifiedCount = 0;
	let adminsNotifiedCount = 0;

	// 3. Process notifications for each birthday employee
	for (const empId of employeeIds) {
		const employee = await prisma.employee.findUnique({
			where: { employeeId: empId },
			select: { name: true }
		});

		if (!employee) continue;

		// Send real-time notification to the celebrating employee
		await createAndBroadcastEmployeeNotification({
			employeeId: empId,
			source: "system",
			purpose: "birthday",
			title: "Happy Birthday 🎉",
			body: `Dear ${employee.name}, the HRMS team wishes you a fantastic birthday filled with happiness and success!`,
			data: { category: "birthday_wish" },
			persist: true
		});
		employeesNotifiedCount++;

		// Alert all admins about this employee's birthday
		for (const admin of admins) {
			await createAndBroadcastEmployeeNotification({
				employeeId: empId, // Relates to the target employee to maintain database indexing rules
				source: "system",
				purpose: "employee_birthday_admin_alert",
				title: "Employee Birthday Alert",
				body: `Today is ${employee.name}'s birthday (${empId}).`,
				data: { adminRecipientId: admin.id, employeeName: employee.name },
				persist: true
			});
			adminsNotifiedCount++;
		}
	}

	return {
		employeesNotifiedCount,
		adminsNotifiedCount,
		processedAt: new Date().toISOString(),
	};
}