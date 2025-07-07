import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Allows HR to update an existing holiday's metadata.
 *
 * @param {string} authHeader
 * @param {Object} data
 * @param {string} data.holidayId        – Holiday UUID (required)
 * @param {string} [data.name]           – New name (optional)
 * @param {string} [data.date]           – New ISO date string (UTC) (optional)
 * @param {string} [data.forShiftId]     – New shiftId (or null for global) (optional)
 * @param {boolean} [data.isActive]      – Toggle status (optional)
 *
 * @returns {Promise<{ message: string, updatedFields: string[] }>}
 */
export async function hrEditAHolidayEntry(authHeader, { holidayId, name, date, forShiftId, isActive }) {
	let db;
	try {
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new Error("Authorization header missing or invalid");
		}

		db = prisma;
		await db.$connect();

		const result = await db.$transaction(async (tx) => {
			// 1️⃣  Verify HR session
			await verifyHrJWT(authHeader);

			// 2️⃣  Ensure holiday exists
			const existing = await tx.holiday.findUnique({
				where: { id: holidayId },
			});
			if (!existing) throw new Error("Holiday not found");

			// 3️⃣  Assemble fields to update
			const updates = {};
			if (name && name !== existing.name) updates.name = name;
			if (typeof isActive === "boolean" && isActive !== existing.isActive)
				updates.isActive = isActive;
			if (forShiftId !== undefined && forShiftId !== existing.forShiftId)
				updates.forShiftId = forShiftId;

			if (date) {
				const parsedDate = new Date(date);
				if (isNaN(parsedDate.getTime())) {
					throw new Error("Invalid date format");
				}
				if (parsedDate.toISOString() !== existing.date.toISOString()) {
					updates.date = parsedDate;
				}
			}

			if (Object.keys(updates).length === 0) {
				return {
					message: "No changes made",
					updatedFields: [],
				};
			}

			await tx.holiday.update({
				where: { id: holidayId },
				data: updates,
			});

			return {
				message: "Holiday updated successfully",
				updatedFields: Object.keys(updates),
			};
		});

		await db.$disconnect();
		return result;
	} catch (err) {
		console.error("🔥 Error in hrEditHoliday:", err);
		try {
			if (db) await db.$disconnect();
		} catch (disconnectErr) {
			console.error("🧨 Error disconnecting DB:", disconnectErr);
		}
		throw err;
	}
}
