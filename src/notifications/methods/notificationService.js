import { prisma } from "#src/db/prisma.js";
import {
	broadcastToEmployeeNotificationSockets,
	getEmployeeNotificationSocketStats,
	getNotificationSocketRegistryStats,
} from "./notificationSocketStore.js";

const SENSITIVE_MAIL_PURPOSES = new Set([
	"otp",
	"twoFA",
	"2fa",
	"emailVerification",
	"passwordReset",
	"resetPassword",
]);

function normalizeEmployeeId(employeeId) {
	if (employeeId === null || employeeId === undefined) return null;

	const normalized = String(employeeId).trim();
	return normalized.length > 0 ? normalized : null;
}

function normalizeEmployeeIds(employeeIds) {
	if (!Array.isArray(employeeIds)) {
		throw new Error("employeeIds must be an array");
	}

	return Array.from(
		new Set(employeeIds.map(normalizeEmployeeId).filter(Boolean))
	);
}

function normalizeNotificationText(value) {
	if (value === null || value === undefined) return null;

	const normalized = String(value).trim();
	return normalized.length > 0 ? normalized : null;
}

function safeNotificationData(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		return {};
	}

	return JSON.parse(JSON.stringify(data));
}

function buildNotificationDto(notification) {
	if (!notification) return null;

	return {
		id: notification.id,
		recipientEmployeeId: notification.recipientEmployeeId,
		source: notification.source,
		purpose: notification.purpose,
		title: notification.title,
		body: notification.body,
		data: notification.data || {},
		isRead: notification.isRead,
		readAt: notification.readAt,
		deliveredAt: notification.deliveredAt,
		createdAt: notification.createdAt,
		updatedAt: notification.updatedAt,
	};
}

function getMailerNotificationTitle({ purpose, payload }) {
	return (
		normalizeNotificationText(payload?.notificationTitle) ||
		normalizeNotificationText(payload?.subject) ||
		`HRMS notification: ${purpose}`
	);
}

function getMailerNotificationBody({ purpose, payload }) {
	return (
		normalizeNotificationText(payload?.notificationBody) ||
		normalizeNotificationText(payload?.message) ||
		`You have a new HRMS update for ${purpose}.`
	);
}

function getPublicMailerPayload(payload = {}) {
	const publicPayload = {};

	for (const [key, value] of Object.entries(payload)) {
		if (
			key === "otp" ||
			key === "password" ||
			key === "token" ||
			key === "authorization" ||
			key === "attachments" ||
			key.toLowerCase().includes("secret")
		) {
			continue;
		}

		if (
			value === null ||
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			publicPayload[key] = value;
		}
	}

	return publicPayload;
}

export async function createAndBroadcastEmployeeNotification({
	employeeId,
	source = "system",
	purpose,
	title,
	body = null,
	data = {},
	persist = true,
}) {
	const recipientEmployeeId = normalizeEmployeeId(employeeId);
	const safePurpose = normalizeNotificationText(purpose);
	const safeTitle = normalizeNotificationText(title);
	const safeBody = normalizeNotificationText(body);

	if (!recipientEmployeeId) {
		throw new Error("employeeId is required");
	}

	if (!safePurpose) {
		throw new Error("purpose is required");
	}

	if (!safeTitle) {
		throw new Error("title is required");
	}

	const safeSource = normalizeNotificationText(source) || "system";
	const safeData = safeNotificationData(data);

	let notification = null;

	if (persist) {
		notification = await prisma.notification.create({
			data: {
				recipientEmployeeId,
				source: safeSource,
				purpose: safePurpose,
				title: safeTitle,
				body: safeBody,
				data: safeData,
			},
		});
	} else {
		notification = {
			id: null,
			recipientEmployeeId,
			source: safeSource,
			purpose: safePurpose,
			title: safeTitle,
			body: safeBody,
			data: safeData,
			isRead: false,
			readAt: null,
			deliveredAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
	}

	const payload = {
		type: "notification.created",
		notification: buildNotificationDto(notification),
	};

	const delivery = broadcastToEmployeeNotificationSockets({
		employeeId: recipientEmployeeId,
		payload,
	});

	if (persist && notification?.id && delivery.deliveredSockets > 0) {
		notification = await prisma.notification.update({
			where: { id: notification.id },
			data: {
				deliveredAt: new Date(),
			},
		});
	}

	return {
		notification: buildNotificationDto(notification),
		delivery,
	};
}

export async function createAndBroadcastEmployeeNotifications({
	employeeIds,
	source = "system",
	purpose,
	title,
	body = null,
	data = {},
	persist = true,
}) {
	const normalizedEmployeeIds = normalizeEmployeeIds(employeeIds);

	const results = [];

	for (const employeeId of normalizedEmployeeIds) {
		results.push(
			await createAndBroadcastEmployeeNotification({
				employeeId,
				source,
				purpose,
				title,
				body,
				data,
				persist,
			})
		);
	}

	return {
		count: results.length,
		results,
	};
}

export async function notifyEmployeeFromMailer({
	employeeId,
	source = "mailer",
	purpose,
	payload = {},
	persist,
}) {
	const recipientEmployeeId = normalizeEmployeeId(employeeId);

	if (!recipientEmployeeId) {
		return {
			skipped: true,
			reason: "employeeId not provided",
		};
	}

	const safePurpose = normalizeNotificationText(purpose);

	if (!safePurpose) {
		return {
			skipped: true,
			reason: "purpose not provided",
		};
	}

	const shouldPersist =
		typeof persist === "boolean"
			? persist
			: !SENSITIVE_MAIL_PURPOSES.has(safePurpose);

	return await createAndBroadcastEmployeeNotification({
		employeeId: recipientEmployeeId,
		source,
		purpose: safePurpose,
		title: getMailerNotificationTitle({ purpose: safePurpose, payload }),
		body: getMailerNotificationBody({ purpose: safePurpose, payload }),
		data: {
			mailerPurpose: safePurpose,
			payload: getPublicMailerPayload(payload),
		},
		persist: shouldPersist,
	});
}

export async function getEmployeeNotifications({
	employeeId,
	limit = 50,
	unreadOnly = false,
}) {
	const recipientEmployeeId = normalizeEmployeeId(employeeId);

	if (!recipientEmployeeId) {
		throw new Error("employeeId is required");
	}

	const take = Math.min(Math.max(Number(limit) || 50, 1), 100);

	const notifications = await prisma.notification.findMany({
		where: {
			recipientEmployeeId,
			...(unreadOnly ? { isRead: false } : {}),
		},
		orderBy: {
			createdAt: "desc",
		},
		take,
	});

	return notifications.map(buildNotificationDto);
}

export async function markEmployeeNotificationRead({
	employeeId,
	notificationId,
}) {
	const recipientEmployeeId = normalizeEmployeeId(employeeId);
	const safeNotificationId = normalizeNotificationText(notificationId);

	if (!recipientEmployeeId) {
		throw new Error("employeeId is required");
	}

	if (!safeNotificationId) {
		throw new Error("notificationId is required");
	}

	await prisma.notification.updateMany({
		where: {
			id: safeNotificationId,
			recipientEmployeeId,
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	const notification = await prisma.notification.findFirst({
		where: {
			id: safeNotificationId,
			recipientEmployeeId,
		},
	});

	if (!notification) {
		throw new Error("Notification not found");
	}

	return buildNotificationDto(notification);
}

export async function markAllEmployeeNotificationsRead({ employeeId }) {
	const recipientEmployeeId = normalizeEmployeeId(employeeId);

	if (!recipientEmployeeId) {
		throw new Error("employeeId is required");
	}

	const result = await prisma.notification.updateMany({
		where: {
			recipientEmployeeId,
			isRead: false,
		},
		data: {
			isRead: true,
			readAt: new Date(),
		},
	});

	return {
		updatedCount: result.count,
	};
}

export function getEmployeeLiveNotificationStats(employeeId) {
	return getEmployeeNotificationSocketStats(employeeId);
}

export function getLiveNotificationRegistryStats() {
	return getNotificationSocketRegistryStats();
}