import { makeEmployeeAttendance } from "../../../biometric-access-machine/methods/makeEmployeeAttendance.js";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";
import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const prisma = new PrismaClient();

const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

export async function hrMakeOrRefreshEmployeeAttendance({
    authHeader,
    employeeId = null,
    date = null,
    monthYear = null,
    year = null,
} = {}) {
    try {
        if (!authHeader) throw new Error("Missing authorization header");

        const decoded = await verifyHrJWT(authHeader);
        const HrId = decoded.hrId;

        const hr = await prisma.hr.findUnique({ where: { id: HrId } });
        if (!hr) throw new Error("HR account not found");

        const safeArgs = {
            employeeId,
        };

        if (date) {
            safeArgs.date = dayjs.tz(date, TIMEZONE).format("YYYY-MM-DD");
        }
        if (monthYear) {
            safeArgs.monthYear = monthYear;
        }
        if (year) {
            safeArgs.year = year;
        }

        await makeEmployeeAttendance(safeArgs);

        return { success: true, message: "Attendance generation completed." };
    } catch (err) {
        console.error("🔥 Failed to generate/refresh attendance:", err);
        return {
            success: false,
            error: "Failed to generate/refresh attendance.",
            detail: err.message,
        };
    }
}
