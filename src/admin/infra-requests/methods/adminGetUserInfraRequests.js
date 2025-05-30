import { PrismaClient } from "@prisma/client";
import { auditor } from "../../../utils/logging/methods/auditor.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminGetUserInfraRequests({
	authHeader,
	limit,
	meta = {},
}) {
	const auth = await verifyAdminJWT(authHeader); // 🔐 Verify admin

	const total = await prisma.userInfraRequest.count();

	// Handle 'all'
	if (limit === "all") {
		const data = await prisma.userInfraRequest.findMany({
			orderBy: { createdAt: "desc" },
			select: baseSelect(),
		});

		auditor({
			actorRole: "admin",
			actorId: verified.adminId,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/admin/infra-requests",
			action: "read",
			status: "success",
			message: `Fetched all (${requests.length}) user infra requests`,
		});

		return {
			data,
		};
	}

	// Parse and validate 'start-end' or 'start-end'
	const [startStr, endStr] = limit.split("-");
	const start = parseInt(startStr, 10);
	const end = endStr === "end" ? total : parseInt(endStr, 10);

	if (
		isNaN(start) ||
		(endStr !== "end" && (isNaN(end) || end < start || start < 1))
	) {
		throw new Error("Invalid 'limit' range. Use 'all' or 'start-end'.");
	}

	const resolvedEnd = Math.min(end, total);
	const resolvedStart = Math.min(start, resolvedEnd);
	const take = resolvedEnd - resolvedStart + 1;
	const skip = resolvedStart - 1;

	const data = await prisma.userInfraRequest.findMany({
		orderBy: { createdAt: "desc" },
		skip,
		take,
		select: baseSelect(),
	});

	auditor({
		actorRole: "admin",
		actorId: verified.adminId,
		ipAddress: meta.ip,
		userAgent: meta.ua,
		referrer: meta.ref,
		endpoint: "/admin/infra-requests",
		action: "read",
		status: "success",
		message: `Fetched user infra requests from ${start} to ${end} (${requests.length} total)`,
	});

	return {
		data,
	};
}

function baseSelect() {
	return {
		id: true,
		requesterId: true,
		requesterRole: true,
		requestType: true,
		reason: true,
		createdAt: true,
		status: true,
		currentCount: true,
		maxIterations: true,
		logRefs: true,
		delegatedToHr: true,
		isVisibleToHr: true,
		resolutionNote: true,
		respondedAt: true,
		adminId: true,
		hrId: true,
		lastHandledBy: true,
	};
}
