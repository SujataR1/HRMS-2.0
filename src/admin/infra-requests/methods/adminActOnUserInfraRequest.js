// admin/infra-requests/methods/adminActOnUserInfraRequest.js

import { PrismaClient } from "@prisma/client";
import { auditor } from "../../../utils/logging/methods/auditor.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminActOnUserInfraRequest({
	authHeader,
	requestId,
	action,
	note = "",
	delegateToHr = false,
	showToHr = false,
	meta,
}) {
	let verified = null;

	try {
		verified = await verifyAdminJWT(authHeader);

		const request = await prisma.userInfraRequest.findUnique({
			where: { id: requestId },
		});

		if (!request) throw new Error("Request not found");
		if (request.status !== "pending")
			throw new Error("Request already resolved");

		// Don't delegate an HR's own request back to HR
		if (delegateToHr && request.requesterRole === "hr") {
			throw new Error("Cannot delegate HR's own request to HR");
		}

		const updates = {
			resolutionNote: note,
			respondedAt: new Date(),
			adminId: verified.adminId,
			lastHandledBy: "admin",
			isVisibleToHr: showToHr,
			delegatedToHr: delegateToHr,
		};

		if (action === "approve") {
			updates.status = "approved";
		} else if (action === "deny") {
			updates.status = "denied";
		} else if (action === "delegate") {
			updates.status = "pending"; // still pending, just delegated
		} else {
			throw new Error("Invalid action type");
		}

		await prisma.userInfraRequest.update({
			where: { id: requestId },
			data: updates,
		});

		auditor({
			actorRole: "admin",
			actorId: verified.adminId,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/admin/infra-requests/act",
			action: action === "approve" ? "verify" : action,
			status: "success",
			message: `${action.toUpperCase()}ED request ${requestId}`,
		});

		return { success: true };
	} catch (err) {
		auditor({
			actorRole: "admin",
			actorId: verified?.adminId ?? null,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/admin/infra-requests/act",
			action: "update",
			status: "failure",
			message: err.message,
		});
		throw err;
	}
}
