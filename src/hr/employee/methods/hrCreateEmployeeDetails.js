import { prisma } from "#src/db/prisma.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrCreateEmployeeDetails(details) {
	if (!details || !details.employeeId) {
		throw new Error("Missing required field: employeeId");
	}

	const toUTC = (t) => dayjs.tz(t, TIMEZONE).utc().toDate();

	return await prisma.$transaction(async (tx) => {

		const existingEmployee = await tx.employee.findUnique({
			where: { employeeId: details.employeeId },
		});

		if (!existingEmployee) {
			throw new Error("Employee with given employeeId does not exist");
		}

		const existing = await tx.employeeDetails.findUnique({
			where: { employeeId: details.employeeId },
		});

		if (existing)
			throw new Error(
				`Details already exist for employeeId: ${details.employeeId}`
			);

		const newDetails = await tx.employeeDetails.create({
			data: {
				...details,
				dateOfJoining: toUTC(details.dateOfJoining),
				confirmationDate: details.confirmationDate
					? toUTC(details.confirmationDate)
					: null,
				dateOfBirth: details.dateOfBirth
					? toUTC(details.dateOfBirth)
					: null,
			},
		});

		return newDetails;
	});
}