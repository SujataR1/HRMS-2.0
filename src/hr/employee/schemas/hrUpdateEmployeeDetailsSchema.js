import { z } from "zod";

const dateField = z.preprocess(
	(val) =>
		typeof val === "string" || val instanceof Date
			? new Date(val)
			: undefined,
	z.date()
);

export const hrUpdateEmployeeDetailsSchema = z
	.object({
		employeeId: z.string().min(1),

		personalEmail: z.string().email().optional(),
		isPersonalEmailVerified: z.boolean().optional(),

		employmentType: z
			.enum([
				"PART_TIME",
				"FULL_TIME",
				"INTERN",
				"CONTRACT",
				"FREELANCER",
			])
			.optional(),
		employmentStatus: z
			.enum([
				"EMPLOYED",
				"RESIGNED",
				"TERMINATED",
				"SUSPENDED",
				"PROBATION",
			])
			.optional(),

		dateOfJoining: dateField.optional(),
		confirmationDate: dateField.optional().nullable(),

		phoneNumber: z.string().optional(),
		emergencyContactNumber: z.string().optional(),

		presentAddress: z.string().optional(),
		permanentAddress: z.string().optional(),

		aadhaarCardNumber: z.string().optional(),
		panCardNumber: z.string().optional(),

		bloodGroup: z
			.enum([
				"A_positive",
				"A_negative",
				"B_positive",
				"B_negative",
				"AB_positive",
				"AB_negative",
				"O_positive",
				"O_negative",
			])
			.optional(),

		medicalNotes: z.string().optional().nullable(),

		highestEducationalQualification: z.string().optional(),
		designation: z.string().optional(),
		department: z.string().optional(),

		bankName: z.string().optional(),
		bankAccountNumber: z.string().optional(),
		ifsCode: z.string().optional(),

		assignedShiftId: z.string().uuid().optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 1, {
		message: "At least one field other than employeeId must be provided",
	});
