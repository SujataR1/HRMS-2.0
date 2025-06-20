import { PrismaClient } from "@prisma/client";
import { auditor } from "../../../utils/logging/methods/auditor.js";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";

const prisma = new PrismaClient();

export async function employeeLogout(authHeader = "", meta = {}) {
	let decoded = null;

	try {
		decoded = await verifyEmployeeJWT(authHeader);
		const token = authHeader.split(" ")[1];

		const deleted = await prisma.employeeActiveSessions.deleteMany({
			where: { token },
		});

		if (deleted.count === 0) {
			auditor({
				actorRole: "employee",
				actorId: decoded.employeeId,
				ipAddress: meta.ip,
				userAgent: meta.ua,
				referrer: meta.ref,
				endpoint: "/employee/logout",
				action: "logout",
				status: "failure",
				message: "No active session found for this token",
			});
			throw new Error("No active session found for this token");
		}

		auditor({
			actorRole: "employee",
			actorId: decoded.employeeId,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/employee/logout",
			action: "logout",
			status: "success",
		});

		return { success: true };
	} catch (err) {
		console.error("🔥 Error in employeeLogout:", err);

		auditor({
			actorRole: "employee",
			actorId: decoded?.employeeId ?? null,
			ipAddress: meta.ip,
			userAgent: meta.ua,
			referrer: meta.ref,
			endpoint: "/employee/logout",
			action: "logout",
			status: "failure",
			message: `Unhandled logout error: ${err.message || "unknown"}`,
		});

		throw err;
	}
}
