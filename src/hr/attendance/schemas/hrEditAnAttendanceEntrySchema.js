import pkg from "@prisma/client";
const { AttendanceFlags, AttendanceStatus } = pkg;

import { z } from "zod";

const attendanceStatusEnum = Object.values(AttendanceStatus);
const attendanceFlagsEnum = Object.values(AttendanceFlags);

export const hrEditAnAttendanceEntrySchema = z.object({
	employeeId: z
		.string({ required_error: "Employee ID is required" })
		("Invalid employee ID format"),

	attendanceDate: z
		.string({ required_error: "Attendance date is required" })
		.refine((val) => !isNaN(Date.parse(val)), {
			message: "Invalid date format",
		}),

	punchIn: z.string().datetime().optional(),
	punchOut: z.string().datetime().optional(),

	status: z.enum([...attendanceStatusEnum]).optional(),

	flags: z.array(z.enum([...attendanceFlagsEnum])).optional(),

	comments: z.string().optional(),
});
