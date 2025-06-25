import { PrismaClient } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { makeEmployeeAttendance } from "./makeEmployeeAttendance.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";
const prisma   = new PrismaClient();

/**
 * Persist biometric punches and trigger attendance rebuilds.
 *
 * @param {Array<{ employeeId: string, timestamp: string, identifier: string }>} logs
 */
export async function insertBiometricLogs(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    throw new Error("Logs must be a non-empty array");
  }

  try {
    /* 🚀 1) Bulk-insert the raw punches (stored as UTC) */
    await prisma.biometricLog.createMany({
      data: logs.map(({ employeeId, timestamp, identifier }) => ({
        employeeId,
        timestamp : dayjs.tz(timestamp, TIMEZONE).toDate(), // convert IST→UTC
        identifier,
      })),
      skipDuplicates: true,
    });

    /* 🚀 2) For every punch, recompute that employee-day’s attendance */
    await Promise.allSettled(
      logs.map(({ employeeId, timestamp }) =>
        makeEmployeeAttendance({
          employeeId,
          date: dayjs
            .tz(timestamp, TIMEZONE)      // localise to env TZ
            .startOf("day")               // midnight local
            .toDate(),                    // JS Date (UTC under the hood)
        })
      )
    );
  } catch (err) {
    console.error("🔥 insertBiometricLogs failed:", err);
    throw err; // bubble up so the route returns 500
  }
}
