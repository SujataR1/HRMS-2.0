import { z } from "zod";

const hhMmTime = z
	.string()
	.regex(
		/^([01]\d|2[0-3]):[0-5]\d$/,
		"Time must be in HH:mm 24-hour format, for example 13:30"
	);

const identifierSchema = z.enum(["fingerprint", "card", "unknown"]);

const breakRuleSchema = z
	.object({
		key: z.string().trim().min(1),
		label: z.string().trim().min(1),

		/**
		 * timeBound:
		 *   Example: lunch between 13:00 and 14:30.
		 *
		 * freeDuration:
		 *   Example: one 20-minute extra break anywhere before scheduled end.
		 */
		kind: z.enum(["timeBound", "freeDuration"]),

		windowStart: hhMmTime.nullable().optional(),
		windowEnd: hhMmTime.nullable().optional(),

		minMinutes: z.number().int().positive(),
		maxMinutes: z.number().int().positive(),

		maxOccurrences: z.number().int().positive().nullable().optional(),

		deduct: z.boolean().default(true),
	})
	.superRefine((rule, ctx) => {
		if (rule.maxMinutes < rule.minMinutes) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxMinutes"],
				message: "maxMinutes must be greater than or equal to minMinutes",
			});
		}

		if (rule.kind === "timeBound") {
			if (!rule.windowStart) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["windowStart"],
					message: "windowStart is required for timeBound breaks",
				});
			}

			if (!rule.windowEnd) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["windowEnd"],
					message: "windowEnd is required for timeBound breaks",
				});
			}
		}

		if (rule.kind === "freeDuration") {
			if (rule.windowStart || rule.windowEnd) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["kind"],
					message:
						"freeDuration breaks should not have windowStart/windowEnd",
				});
			}
		}
	});

export const shiftBreakPolicySchema = z
	.object({
		version: z.literal(1).default(1),

		/**
		 * Current physical assumption:
		 *   going out  => inside machine => fingerprint-like
		 *   coming in  => outside Wiegand => card-like
		 *
		 * unknown is ignored as side evidence.
		 */
		signalHints: z
			.object({
				exitIdentifiers: z.array(identifierSchema).min(1).default(["fingerprint"]),
				entryIdentifiers: z.array(identifierSchema).min(1).default(["card"]),
				ignoredIdentifiers: z.array(identifierSchema).default(["unknown"]),
			})
			.default({
				exitIdentifiers: ["fingerprint"],
				entryIdentifiers: ["card"],
				ignoredIdentifiers: ["unknown"],
			}),

		breaks: z.array(breakRuleSchema).default([]),

		unclassifiedBreaks: z
			.object({
				deduct: z.boolean().default(false),
				flagOnly: z.boolean().default(true),
			})
			.default({
				deduct: false,
				flagOnly: true,
			}),
	})
	.superRefine((policy, ctx) => {
		const seenKeys = new Set();

		for (const [index, rule] of policy.breaks.entries()) {
			if (seenKeys.has(rule.key)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["breaks", index, "key"],
					message: `Duplicate break key: ${rule.key}`,
				});
			}

			seenKeys.add(rule.key);
		}
	})
	.nullable()
	.optional();