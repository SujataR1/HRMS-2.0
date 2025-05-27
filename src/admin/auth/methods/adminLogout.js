import { PrismaClient } from "@prisma/client";
import { auditor } from "../../../utils/logging/methods/auditor.js";
import { verifyAdminJWT } from "../../admin-session-management/methods/adminSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function adminLogout(authHeader = "", meta = {}) {
	let decoded = null;

	try {
		decoded = await verifyAdminJWT(authHeader);
		const token = authHeader.split(" ")[1];

		const deleted = await prisma.adminActiveSessions.deleteMany({
			where: { token },
		});

		if (deleted.count === 0) {
			auditor({
				actorRole: "admin",
				actorId: decoded.adminId,
				ipAddress: meta.ip,
				userAgent: meta.ua,
				referrer: meta.ref,
				endpoint: "/admin/logout",
				action: "logout",
				status: "failure",
				message: "No active session found for this token",
			});
			throw new Error("No active session found for this token");
		}

		auditor({
			actorRole: "admin",
			actorId: decoded.adminId,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/admin/logout",
			action: "logout",
			status: "success",
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Error in adminLogout:", err);

		auditor({
			actorRole: "admin",
			actorId: decoded?.adminId ?? null,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/admin/logout",
			action: "logout",
			status: "failure",
			message: `Unhandled logout error: ${err.message || "unknown"}`,
		});

		throw err;
	}
}
