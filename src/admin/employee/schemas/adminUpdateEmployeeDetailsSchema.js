import { z } from "zod";

export const adminUpdateEmployeeDetailsSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  updates: z.object({
    personalEmail: z.string().email().optional(),
    employmentType: z.string().optional(),
    employmentStatus: z.string().optional(),
    dateOfJoining: z.string().optional(),
    confirmationDate: z.string().nullable().optional(),
    phoneNumber: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
    presentAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    aadhaarCardNumber: z.string().optional(),
    panCardNumber: z.string().optional(),
    bloodGroup: z.string().optional(),
    medicalNotes: z.string().optional(),
    highestEducationalQualification: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    ifsCode: z.string().optional(),
    assignedShiftId: z.string().nullable().optional(),
  })
});
