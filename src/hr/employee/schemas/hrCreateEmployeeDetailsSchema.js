import { z } from "zod";

export const hrCreateEmployeeDetailsSchema = z.object({
	employeeId: z.string().min(1),

	personalEmail: z.string().email(),
	isPersonalEmailVerified: z.boolean().default(false),

	employmentType: z.enum([
		"PART_TIME",
		"FULL_TIME",
		"INTERN",
		"CONTRACT",
		"FREELANCER",
	]),
	employmentStatus: z.enum([
		"EMPLOYED",
		"RESIGNED",
		"TERMINATED",
		"SUSPENDED",
		"PROBATION",
	]),

	dateOfJoining: z.string().datetime(),
	confirmationDate: z.string().datetime().optional().nullable(),

	phoneNumber: z.string().min(1),
	emergencyContactNumber: z.string().min(1),

	presentAddress: z.string().min(1),
	permanentAddress: z.string().min(1),

	aadhaarCardNumber: z.string().min(1),
	panCardNumber: z.string().min(1),

	bloodGroup: z.enum([
		"A_positive",
		"A_negative",
		"B_positive",
		"B_negative",
		"AB_positive",
		"AB_negative",
		"O_positive",
		"O_negative",
	]),

	medicalNotes: z.string().optional().nullable(),

	highestEducationalQualification: z.string().min(1),
	designation: z.string().min(1),
	department: z.string().min(1),

	bankName: z.string().min(1),
	bankAccountNumber: z.string().min(1),
	ifsCode: z.string().min(1),

	assignedShiftId: z.string().optional().nullable(),
});
