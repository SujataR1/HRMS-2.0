/**
 * Notify all employees currently assigned to a shift that it was updated.
 *
 * Invariants:
 * - Source of truth: EmployeeDetails.assignedShiftId === shiftId
 * - Email is best-effort: never blocks shift edit unless throwOnFailure=true
 * - Payload matches template contract: { employeeName }
 */

import { PrismaClient } from "@prisma/client";
import { sendEmployeeMail } from "../../../employee/mailer/methods/employeeMailer.js";

const prisma = new PrismaClient();

export async function hrNotifyEmployeesShiftUpdated({
	shiftId,
	throwOnFailure = false,
	concurrency = 5,
}) {
	if (!shiftId) throw new Error("Missing required field: shiftId");

	// 1) Who is assigned to this shift? (truth source)
	const assignments = await prisma.employeeDetails.findMany({
		where: { assignedShiftId: shiftId },
		select: { employeeId: true },
	});

	const employeeIds = assignments
		.map((a) => a.employeeId)
		.filter((id) => typeof id === "string" && id.length > 0);

	if (employeeIds.length === 0) {
		return {
			attempted: 0,
			notified: 0,
			skipped: 0,
			failed: 0,
			failures: [],
		};
	}

	// 2) Get emails + names
	const employees = await prisma.employee.findMany({
		where: { employeeId: { in: employeeIds } },
		select: { employeeId: true, name: true, assignedEmail: true },
	});

	// 3) Prepare tasks (one per recipient)
	const tasks = employees.map((e) => async () => {
		if (!e.assignedEmail) {
			return { status: "skipped", employeeId: e.employeeId, reason: "Missing assignedEmail" };
		}

		// Template contract: ONLY employeeName is required
		await sendEmployeeMail({
			to: e.assignedEmail,
			purpose: "shift-updated",
			payload: {
				employeeName: (e.name && e.name.trim()) || "there",
			},
		});

		return { status: "sent", employeeId: e.employeeId };
	});

	// 4) Run with concurrency cap (careful to SMTP + CPU)
	const results = await runWithConcurrency(tasks, concurrency);

	const failures = results.filter((r) => r.status === "failed");
	const skipped = results.filter((r) => r.status === "skipped");
	const sent = results.filter((r) => r.status === "sent");

	if (throwOnFailure && failures.length > 0) {
		const err = new Error("Some shift-updated mails failed");
		err.meta = { failures, skipped, sent: sent.length };
		throw err;
	}

	return {
		attempted: tasks.length,
		notified: sent.length,
		skipped: skipped.length,
		failed: failures.length,
		failures,
	};
}

async function runWithConcurrency(taskFns, limit) {
	const results = new Array(taskFns.length);
	let i = 0;

	const workers = Array.from(
		{ length: Math.min(limit, taskFns.length) },
		() =>
			(async () => {
				while (true) {
					const idx = i++;
					if (idx >= taskFns.length) return;

					try {
						results[idx] = await taskFns[idx]();
					} catch (err) {
						results[idx] = {
							status: "failed",
							reason: err?.message || String(err),
						};
					}
				}
			})()
	);

	await Promise.all(workers);
	return results;
}
