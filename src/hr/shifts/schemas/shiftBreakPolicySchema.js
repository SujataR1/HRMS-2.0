import { z } from "zod";

const hhMmTime = z
	.string()
	.regex(
		/^([01]\d|2[0-3]):[0-5]\d$/,
		"Time must be in HH:mm 24-hour format, for example 13:30"
	);

const identifierSchema = z.enum(["fingerprint", "card", "unknown"]);

function timeToMinutes(value) {
	const [hour, minute] = value.split(":").map(Number);
	return hour * 60 + minute;
}

function expandWindowToDayIntervals({ start, end }) {
	const startMinutes = timeToMinutes(start);
	const endMinutes = timeToMinutes(end);

	if (startMinutes === endMinutes) {
		return [];
	}

	if (startMinutes < endMinutes) {
		return [
			{
				start: startMinutes,
				end: endMinutes,
			},
		];
	}

	return [
		{
			start: startMinutes,
			end: 24 * 60,
		},
		{
			start: 0,
			end: endMinutes,
		},
	];
}

function intervalsOverlap(a, b) {
	return a.start < b.end && b.start < a.end;
}

function windowsOverlap(a, b) {
	const aIntervals = expandWindowToDayIntervals({
		start: a.windowStart,
		end: a.windowEnd,
	});

	const bIntervals = expandWindowToDayIntervals({
		start: b.windowStart,
		end: b.windowEnd,
	});

	for (const aInterval of aIntervals) {
		for (const bInterval of bIntervals) {
			if (intervalsOverlap(aInterval, bInterval)) {
				return true;
			}
		}
	}

	return false;
}

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

			if (rule.windowStart && rule.windowEnd && rule.windowStart === rule.windowEnd) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["windowEnd"],
					message: "windowStart and windowEnd cannot be the same",
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

		const timeBoundBreaks = policy.breaks
			.map((rule, index) => ({
				...rule,
				index,
			}))
			.filter(
				(rule) =>
					rule.kind === "timeBound" &&
					rule.windowStart &&
					rule.windowEnd &&
					rule.windowStart !== rule.windowEnd
			);

		for (let i = 0; i < timeBoundBreaks.length; i += 1) {
			for (let j = i + 1; j < timeBoundBreaks.length; j += 1) {
				const left = timeBoundBreaks[i];
				const right = timeBoundBreaks[j];

				if (!windowsOverlap(left, right)) continue;

				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["breaks", right.index, "windowStart"],
					message: `Break window overlaps with "${left.key}"`,
				});
			}
		}

		const exitSet = new Set(policy.signalHints.exitIdentifiers);
		const entrySet = new Set(policy.signalHints.entryIdentifiers);

		for (const identifier of entrySet) {
			if (!exitSet.has(identifier)) continue;

			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["signalHints", "entryIdentifiers"],
				message: `Identifier "${identifier}" cannot be both entry-like and exit-like`,
			});
		}
	})
	.nullable()
	.optional();