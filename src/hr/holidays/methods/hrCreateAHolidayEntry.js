import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrCreateAHolidayEntry({ date, name, forShiftId }) {
	if (!date || !name) throw new Error('Both "date" and "name" are required');

	const istDate = dayjs.tz(date, TIMEZONE);
	if (!istDate.isValid()) throw new Error("Invalid date format");

	const utcDate = istDate.utc().toDate();

	const created = await prisma.holiday.create({
		data: {
			date: utcDate,
			name,
			forShiftId,
		},
	});

	return {
		success: true,
		holiday: {
			id: created.id,
			name: created.name,
			date: istDate.format("DD.MM.YYYY"),
			forShiftId: created.forShiftId,
			isActive: created.isActive,
		},
	};
}
