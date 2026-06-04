import fp from "fastify-plugin";
import { verifyEmployeeJWT } from "#src/employee/employee-session-management/methods/employeeSessionManagementMethods.js";
import {
	registerEmployeeNotificationSocket,
	safeJsonSend,
	unregisterEmployeeNotificationSocket,
} from "../methods/notificationSocketStore.js";

function getAuthHeaderFromRequest(request) {
	const queryToken = request.query?.token;
	const queryAuthorization = request.query?.authorization;
	const headerAuthorization = request.headers?.authorization;

	const rawToken = queryToken || queryAuthorization || headerAuthorization;

	if (!rawToken || typeof rawToken !== "string") {
		throw new Error("Notification socket token missing");
	}

	return rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`;
}

export default fp(async function employeeNotificationSocketRoute(fastify) {
	fastify.get(
		"/employee/notifications/ws",
		{ websocket: true },
		(socket, request) => {
			let registeredEmployeeId = null;

			function cleanup() {
				unregisterEmployeeNotificationSocket(socket);
			}

			socket.on("message", (rawMessage) => {
				try {
					const text = rawMessage?.toString?.() || "";
					const parsed = text ? JSON.parse(text) : {};

					if (parsed?.type === "ping") {
						safeJsonSend(socket, {
							type: "pong",
							at: new Date().toISOString(),
						});
					}
				} catch {
					safeJsonSend(socket, {
						type: "notification.socket.warning",
						message: "Invalid socket message",
					});
				}
			});

			socket.on("close", cleanup);
			socket.on("error", cleanup);

			void (async () => {
				try {
					const authHeader = getAuthHeaderFromRequest(request);
					const decoded = await verifyEmployeeJWT(authHeader);

					registeredEmployeeId = decoded.employeeId;

                    socket.isAlive = true;

                    socket.on("pong", () => {
                        socket.isAlive = true;
                    });

					const registration = registerEmployeeNotificationSocket({
						employeeId: registeredEmployeeId,
						socket,
					});

					safeJsonSend(socket, {
						type: "notification.socket.connected",
						employeeId: registeredEmployeeId,
						connectedSockets: registration.socketCount,
						at: new Date().toISOString(),
					});
				} catch (err) {
					request.log.warn(
						{ err },
						"Notification websocket authentication failed"
					);

					safeJsonSend(socket, {
						type: "notification.socket.unauthorized",
						message: "Unauthorized notification socket",
					});

					socket.close(1008, "Unauthorized");
				}
			})();
		}
	);
});