import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrUpdateEmployeeDetails({ employeeId, ...updateFields }) {
	if (!employeeId || Object.keys(updateFields).length === 0) {
		throw new Error(
			"Missing required fields: employeeId and at least one field to update"
		);
	}

	const toUTC = (t) => dayjs.tz(t, TIMEZONE).utc().toDate();

	if (updateFields.dateOfJoining) {
		updateFields.dateOfJoining = toUTC(updateFields.dateOfJoining);
	}
	if (updateFields.confirmationDate) {
		updateFields.confirmationDate = toUTC(updateFields.confirmationDate);
	}

	return await prisma.$transaction(async (tx) => {
		const updated = await tx.employeeDetails.update({
			where: { employeeId },
			data: updateFields,
		});
		return updated;
	});
}
