import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Fetch holiday records with optional filters.
 *
 * @param {Object} params
 * @param {string} params.authHeader          – "Bearer <token>"      (required)
 * @param {string[]} [params.shiftIds]        – Array of Shift UUIDs  (optional)
 * @param {string}  [params.fromDate]         – "YYYY-MM-DD" (UTC)    (optional, must pair with toDate)
 * @param {string}  [params.toDate]           – "YYYY-MM-DD" (UTC)    (optional, must pair with fromDate)
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

	try {
		await verifyHrJWT(authHeader);
	} catch {
		throw new Error("Invalid or expired HR token");
	}

	/* --------------------- 2️⃣  Input validation ------------------------ */
	if ((fromDate && !toDate) || (!fromDate && toDate)) {
		throw new Error("Both fromDate and toDate must be supplied together");
	}

	let fromISO = null;
	let toISO = null;

	if (fromDate && toDate) {
		if (isNaN(Date.parse(fromDate)) || isNaN(Date.parse(toDate))) {
			throw new Error("fromDate / toDate must be valid ISO dates (UTC)");
		}
		fromISO = new Date(fromDate); // UTC by default
		toISO = new Date(toDate);

		if (fromISO > toISO) throw new Error("fromDate cannot be after toDate");
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

	/* --------------------- 4️⃣  Return (UTC) ---------------------------- */
	return holidays.map((h) => ({
		id: h.id,
		date: h.date.toISOString().split("T")[0], // YYYY-MM-DD
		name: h.name,
		forShiftId: h.forShiftId,
		isActive: h.isActive,
	}));
}
