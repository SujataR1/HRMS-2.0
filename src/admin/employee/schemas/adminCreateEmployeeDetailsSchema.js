import { z } from "zod";

export const adminCreateEmployeeDetailsSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  details: z.object({
    personalEmail: z.string().email("Invalid personal email"),
    employmentType: z.string(),
    employmentStatus: z.string(),
    dateOfJoining: z.string(),
    confirmationDate: z.string().nullable(),
    phoneNumber: z.string(),
    emergencyContactNumber: z.string(),
    presentAddress: z.string(),
    permanentAddress: z.string(),
    aadhaarCardNumber: z.string(),
    panCardNumber: z.string(),
    bloodGroup: z.string(),
    medicalNotes: z.string().optional(),
    highestEducationalQualification: z.string(),
    designation: z.string(),
    department: z.string(),
    bankName: z.string(),
    bankAccountNumber: z.string(),
    ifsCode: z.string(),
    assignedShiftId: z.string().nullable().optional(),
  })
});
