import { enqueueAuditLog } from "./logQueue.js";

/**
 * Push a log entry into the audit log system.
 *
 * @param {Object} payload
 * @param {"admin" | "hr" | "employee" | "system" | "unauthenticated"} payload.actorRole
 * @param {string|null} payload.actorId
 * @param {"admin" | "hr" | "employee"| null} [payload.targetRole]
 * @param {string|null} [payload.targetId]
 * @param {string} payload.ipAddress
 * @param {string} payload.userAgent
 * @param {string} [payload.referrer]
 * @param {string} payload.endpoint
 * @param {
 *   "create" | "read" | "update" | "delete" |
 *   "login" | "logout" | "access" | "verify" |
 *   "revoke" | "promote" | "demote" |
 *   "generate" | "send" | "upload" | "download"
 * } payload.action
 * @param {"success" | "failure"} payload.status
 * @param {string} [payload.message]
 */
export function auditor({
	actorRole = "unauthenticated",
	actorId = null,
	targetRole = null,
	targetId = null,
	ipAddress = "",
	userAgent = "",
	referrer = "",
	endpoint = "",
	action = "access",
	status = "success",
	message = "",
}) {
	enqueueAuditLog({
		actorRole,
		actorId,
		targetRole,
		targetId,
		ipAddress,
		userAgent,
		referrer,
		endpoint,
		action,
		status,
		message,
		timestamp: new Date(),
	});
}
