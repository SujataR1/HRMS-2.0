import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrCreateEmployeeDetails(details) {
	if (!details || !details.employeeId) {
		throw new Error("Missing required field: employeeId");
	}

	const toUTC = (t) => dayjs.tz(t, TIMEZONE).utc().toDate();

	return await prisma.$transaction(async (tx) => {
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
			},
		});

		return newDetails;
	});
}
