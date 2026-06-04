const socketsByEmployeeId = new Map();
const employeeIdBySocket = new WeakMap();

function isSocketOpen(socket) {
	return socket?.readyState === 1;
}

export function safeJsonSend(socket, payload) {
	if (!isSocketOpen(socket)) return false;

	try {
		socket.send(JSON.stringify(payload));
		return true;
	} catch {
		return false;
	}
}

export function registerEmployeeNotificationSocket({ employeeId, socket }) {
	if (!employeeId) {
		throw new Error("employeeId is required to register notification socket");
	}

	if (!socketsByEmployeeId.has(employeeId)) {
		socketsByEmployeeId.set(employeeId, new Set());
	}

	socketsByEmployeeId.get(employeeId).add(socket);
	employeeIdBySocket.set(socket, employeeId);

	return {
		employeeId,
		socketCount: socketsByEmployeeId.get(employeeId).size,
	};
}

export function unregisterEmployeeNotificationSocket(socket) {
	const employeeId = employeeIdBySocket.get(socket);

	if (!employeeId) {
		return {
			employeeId: null,
			socketCount: 0,
		};
	}

	const sockets = socketsByEmployeeId.get(employeeId);

	if (sockets) {
		sockets.delete(socket);

		if (sockets.size === 0) {
			socketsByEmployeeId.delete(employeeId);
		}
	}

	employeeIdBySocket.delete(socket);

	return {
		employeeId,
		socketCount: socketsByEmployeeId.get(employeeId)?.size || 0,
	};
}

export function broadcastToEmployeeNotificationSockets({ employeeId, payload }) {
	const sockets = socketsByEmployeeId.get(employeeId);

	if (!sockets || sockets.size === 0) {
		return {
			employeeId,
			connectedSockets: 0,
			deliveredSockets: 0,
		};
	}

	let deliveredSockets = 0;

	for (const socket of Array.from(sockets)) {
		if (!isSocketOpen(socket)) {
			unregisterEmployeeNotificationSocket(socket);
			continue;
		}

		if (safeJsonSend(socket, payload)) {
			deliveredSockets++;
		}
	}

	return {
		employeeId,
		connectedSockets: socketsByEmployeeId.get(employeeId)?.size || 0,
		deliveredSockets,
	};
}

export function getEmployeeNotificationSocketStats(employeeId) {
	return {
		employeeId,
		connectedSockets: socketsByEmployeeId.get(employeeId)?.size || 0,
	};
}

export function getNotificationSocketRegistryStats() {
	const employees = [];

	for (const [employeeId, sockets] of socketsByEmployeeId.entries()) {
		employees.push({
			employeeId,
			connectedSockets: sockets.size,
		});
	}

	return {
		connectedEmployees: employees.length,
		connectedSockets: employees.reduce(
			(total, item) => total + item.connectedSockets,
			0
		),
		employees,
	};
}

export function startNotificationSocketHeartbeat({
	intervalMs = 30000,
	logger = console,
} = {}) {
	const timer = setInterval(() => {
		for (const [employeeId, sockets] of socketsByEmployeeId.entries()) {
			for (const socket of Array.from(sockets)) {
				if (!isSocketOpen(socket)) {
					unregisterEmployeeNotificationSocket(socket);
					continue;
				}

				if (socket.isAlive === false) {
					unregisterEmployeeNotificationSocket(socket);

					try {
						socket.terminate();
					} catch {
						// already gone
					}

					continue;
				}

				socket.isAlive = false;

				try {
					socket.ping();
				} catch (err) {
					unregisterEmployeeNotificationSocket(socket);

					try {
						socket.terminate();
					} catch {
						// already gone
					}

					logger.warn?.(
						{ err, employeeId },
						"Notification socket ping failed"
					);
				}
			}
		}
	}, intervalMs);

	timer.unref?.();

	return timer;
}