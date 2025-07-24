import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

dayjs.extend(timezone);

const prisma = new PrismaClient();
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Fetch holiday records with optional filters.
 *
 * @param {Object} params
 * @param {string} params.authHeader          – "Bearer <token>"      (required)
 * @param {string[]} [params.shiftIds]        – Array of Shift UUIDs  (optional)
 * @param {string}  [params.fromDate]         – "YYYY-MM-DD" (IST)    (optional, must pair with toDate)
 * @param {string}  [params.toDate]           – "YYYY-MM-DD" (IST)    (optional, must pair with fromDate)
 *
 * @returns {Promise<Array>}                  – Array of holiday objects
 */
export async function hrGetHolidayEntries({
	authHeader,
	shiftIds = null,
	fromDate = null,
	toDate = null,
}) {
	/* --------------------- 1️⃣  Auth ------------------------------------ */
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throw new Error("Authorization header missing or invalid");

	// try {
		await verifyHrJWT(authHeader);
	// } catch {
	// 	throw new Error("Invalid or expired HR token");
	// }

	/* --------------------- 2️⃣  Input validation ------------------------ */
	if ((fromDate && !toDate) || (!fromDate && toDate)) {
		throw new Error("Both fromDate and toDate must be supplied together");
	}

	let fromISO = null;
	let toISO = null;

	if (fromDate && toDate) {
		const fromIST = dayjs.tz(fromDate, TIMEZONE).startOf("day");
		const toIST = dayjs.tz(toDate, TIMEZONE).endOf("day");

		if (!fromIST.isValid() || !toIST.isValid()) {
			throw new Error("fromDate / toDate must be valid YYYY-MM-DD dates");
		}

		if (fromIST.isAfter(toIST)) {
			throw new Error("fromDate cannot be after toDate");
		}

		fromISO = fromIST.utc().toDate();
		toISO = toIST.utc().toDate();
	}

	/* --------------------- 3️⃣  Query Prisma ---------------------------- */
	const whereClause = {
		...(shiftIds?.length && { forShiftId: { in: shiftIds } }),
		...(fromISO &&
			toISO && {
				date: {
					gte: fromISO,
					lte: toISO,
				},
			}),
	};

	const holidays = await prisma.holiday.findMany({
		where: whereClause,
		orderBy: { date: "asc" },
	});

	/* --------------------- 4️⃣  Return (IST format YYYY-MM-DD) ------------ */
	return holidays.map((h) => ({
		id: h.id,
		date: dayjs(h.date).tz(TIMEZONE).format("YYYY-MM-DD"),
		name: h.name,
		forShiftId: h.forShiftId,
		isActive: h.isActive,
	}));

}
