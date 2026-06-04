import fp from "fastify-plugin";
import { verifyEmployeeJWT } from "#src/employee/employee-session-management/methods/employeeSessionManagementMethods.js";
import {
	getEmployeeLiveNotificationStats,
	getEmployeeNotifications,
	markAllEmployeeNotificationsRead,
	markEmployeeNotificationRead,
} from "../methods/notificationService.js";

async function getEmployeeIdFromRequest(request) {
	const authHeader = request.headers.authorization;

	if (!authHeader) {
		throw new Error("Authorization header missing");
	}

	const decoded = await verifyEmployeeJWT(authHeader);
	return decoded.employeeId;
}

export default fp(async function employeeNotificationRoutes(fastify) {
	fastify.get("/employee/notifications", async (request, reply) => {
		try {
			const employeeId = await getEmployeeIdFromRequest(request);

			const notifications = await getEmployeeNotifications({
				employeeId,
				limit: request.query?.limit,
				unreadOnly: request.query?.unreadOnly === "true",
			});

			reply.header("x-auth-sign", "employee_notifications_list_ok ||| 001");
			return reply.code(200).send({
				status: "success",
				notifications,
			});
		} catch (err) {
			request.log.error({ err }, "Failed to list employee notifications");

			reply.header("x-auth-sign", "employee_notifications_list_err ||| 002");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Failed to list notifications",
			});
		}
	});

	fastify.patch(
		"/employee/notifications/:notificationId/read",
		async (request, reply) => {
			try {
				const employeeId = await getEmployeeIdFromRequest(request);

				const notification = await markEmployeeNotificationRead({
					employeeId,
					notificationId: request.params.notificationId,
				});

				reply.header(
					"x-auth-sign",
					"employee_notification_mark_read_ok ||| 003"
				);
				return reply.code(200).send({
					status: "success",
					notification,
				});
			} catch (err) {
				request.log.error({ err }, "Failed to mark notification as read");

				reply.header(
					"x-auth-sign",
					"employee_notification_mark_read_err ||| 004"
				);
				return reply.code(400).send({
					status: "error",
					message: err.message || "Failed to mark notification as read",
				});
			}
		}
	);

	fastify.patch("/employee/notifications/read-all", async (request, reply) => {
		try {
			const employeeId = await getEmployeeIdFromRequest(request);

			const result = await markAllEmployeeNotificationsRead({
				employeeId,
			});

			reply.header(
				"x-auth-sign",
				"employee_notifications_mark_all_read_ok ||| 005"
			);
			return reply.code(200).send({
				status: "success",
				...result,
			});
		} catch (err) {
			request.log.error(
				{ err },
				"Failed to mark all employee notifications as read"
			);

			reply.header(
				"x-auth-sign",
				"employee_notifications_mark_all_read_err ||| 006"
			);
			return reply.code(400).send({
				status: "error",
				message:
					err.message || "Failed to mark all notifications as read",
			});
		}
	});

	fastify.get("/employee/notifications/socket-stats", async (request, reply) => {
		try {
			const employeeId = await getEmployeeIdFromRequest(request);

			reply.header(
				"x-auth-sign",
				"employee_notification_socket_stats_ok ||| 007"
			);
			return reply.code(200).send({
				status: "success",
				...getEmployeeLiveNotificationStats(employeeId),
			});
		} catch (err) {
			request.log.error(
				{ err },
				"Failed to get employee notification socket stats"
			);

			reply.header(
				"x-auth-sign",
				"employee_notification_socket_stats_err ||| 008"
			);
			return reply.code(400).send({
				status: "error",
				message:
					err.message ||
					"Failed to get notification socket stats",
			});
		}
	});
});