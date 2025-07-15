import { z } from "zod";

const PaymentStatuses = ["PAID", "UNPAID", "LOP", "COMP_OFF"];
const ConflictingCombos = [
	["PAID", "UNPAID"],
	["PAID", "LOP"],
	["COMP_OFF", "UNPAID"],
	["COMP_OFF", "LOP"],
];

export const hrApproveOrRejectLeaveSchema = z
	.object({
		leaveId: z
			.string({ required_error: "leaveId is required" })
			.uuid("Invalid leave ID"),

		action: z.enum(["approved", "rejected"], {
			required_error: "Action must be either 'approved' or 'rejected'",
		}),

		paymentStatuses: z
			.array(z.enum(PaymentStatuses))
			.min(1, "At least one payment status is required")
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.action === "approved") {
			if (!data.paymentStatuses || data.paymentStatuses.length === 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "paymentStatuses must be provided when approving",
					path: ["paymentStatuses"],
				});
			} else {
				for (const combo of ConflictingCombos) {
					if (combo.every((status) => data.paymentStatuses.includes(status))) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Conflicting payment statuses: ${combo.join(" + ")}`,
							path: ["paymentStatuses"],
						});
						break;
					}
				}
			}
		}
	});
