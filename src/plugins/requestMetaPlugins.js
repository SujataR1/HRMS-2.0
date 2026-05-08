import fp from "fastify-plugin";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const AES_SECRET = process.env.AES_SECRET;
const AES_ALGO = "aes-256-cbc";

const ACTOR_CACHE_TTL_MS = 5 * 60 * 1000;
const actorCache = new Map();

function getMetaFromRequest(request) {
	return {
		ip: request.ip,
		ua: request.headers["user-agent"] || "",
		ref: request.headers["referer"] || "",
	};
}

function createUnknownActor(role = "unauthenticated") {
	return {
		role,
		name: null,
		id: null,
	};
}

function getCachedActor(cacheKey) {
	const cached = actorCache.get(cacheKey);

	if (!cached) return null;

	if (cached.expiresAt <= Date.now()) {
		actorCache.delete(cacheKey);
		return null;
	}

	return cached.actor;
}

function setCachedActor(cacheKey, actor) {
	actorCache.set(cacheKey, {
		actor,
		expiresAt: Date.now() + ACTOR_CACHE_TTL_MS,
	});

	return actor;
}

function extractBearerToken(authHeader = "") {
	if (!authHeader.startsWith("Bearer ")) return null;
	return authHeader.slice("Bearer ".length).trim() || null;
}

function decryptEncryptedJwtToken(encryptedToken) {
	if (!AES_SECRET) return null;

	try {
		const iv = Buffer.from(encryptedToken.slice(0, 32), "hex");
		const encrypted = encryptedToken.slice(32);

		const decipher = crypto.createDecipheriv(
			AES_ALGO,
			Buffer.from(AES_SECRET, "hex"),
			iv
		);

		let decrypted = decipher.update(encrypted, "hex", "utf-8");
		decrypted += decipher.final("utf-8");

		return decrypted;
	} catch {
		return null;
	}
}

function resolveJwtTokenFromBearerToken(token) {
	if (!token) return null;

	// HR tokens are plain JWTs in the current system.
	if (token.includes(".")) {
		return token;
	}

	// Admin and employee tokens are encrypted JWT strings.
	return decryptEncryptedJwtToken(token);
}

function verifyJwtForLogging(jwtToken) {
	if (!jwtToken || !JWT_SECRET) return null;

	try {
		return jwt.verify(jwtToken, JWT_SECRET, {
			ignoreExpiration: true,
		});
	} catch {
		return null;
	}
}

async function resolveAdminActor(fastify, adminId) {
	const cacheKey = `admin:${adminId}`;
	const cached = getCachedActor(cacheKey);
	if (cached) return cached;

	const admin = await fastify.prisma.admin.findUnique({
		where: {
			id: adminId,
		},
		select: {
			id: true,
			name: true,
		},
	});

	if (!admin) {
		return createUnknownActor("admin");
	}

	return setCachedActor(cacheKey, {
		role: "admin",
		name: admin.name || null,
		id: admin.id,
	});
}

async function resolveHrActor(fastify, hrId) {
	const cacheKey = `hr:${hrId}`;
	const cached = getCachedActor(cacheKey);
	if (cached) return cached;

	const hr = await fastify.prisma.hr.findUnique({
		where: {
			id: hrId,
		},
		select: {
			name: true,
			employeeId: true,
		},
	});

	if (!hr) {
		return createUnknownActor("hr");
	}

	return setCachedActor(cacheKey, {
		role: "hr",
		name: hr.name || null,
		id: hr.employeeId,
	});
}

async function resolveEmployeeActor(fastify, employeeId) {
	const cacheKey = `employee:${employeeId}`;
	const cached = getCachedActor(cacheKey);
	if (cached) return cached;

	const employee = await fastify.prisma.employee.findUnique({
		where: {
			employeeId,
		},
		select: {
			name: true,
			employeeId: true,
		},
	});

	if (!employee) {
		return createUnknownActor("employee");
	}

	return setCachedActor(cacheKey, {
		role: "employee",
		name: employee.name || null,
		id: employee.employeeId,
	});
}

async function resolveRequestActor(fastify, request) {
	const token = extractBearerToken(request.headers.authorization || "");

	if (!token) {
		return createUnknownActor("unauthenticated");
	}

	const jwtToken = resolveJwtTokenFromBearerToken(token);
	const decoded = verifyJwtForLogging(jwtToken);

	if (!decoded || typeof decoded !== "object") {
		return createUnknownActor("unknown");
	}

	try {
		if (decoded.adminId) {
			return await resolveAdminActor(fastify, decoded.adminId);
		}

		if (decoded.hrId) {
			return await resolveHrActor(fastify, decoded.hrId);
		}

		if (decoded.employeeId) {
			return await resolveEmployeeActor(fastify, decoded.employeeId);
		}

		return createUnknownActor("unknown");
	} catch {
		return createUnknownActor("unknown");
	}
}

function formatActor(actor) {
	if (!actor?.role) return "unknown";

	if (actor.name && actor.id) {
		return `${actor.role}: ${actor.name} (${actor.id})`;
	}

	if (actor.id) {
		return `${actor.role}: ${actor.id}`;
	}

	return actor.role;
}

export default fp(async function requestMetaPlugin(fastify) {
	fastify.addHook("onRequest", async (request, _reply) => {
		request.meta = {
			...getMetaFromRequest(request),
			startedAtMs: Date.now(),
		};

		request.actor = createUnknownActor("unresolved");
	});

	fastify.addHook("preHandler", async (request, _reply) => {
		request.actor = await resolveRequestActor(fastify, request);
		request.meta.actor = request.actor;
	});

	fastify.addHook("onResponse", async (request, reply) => {
		const responseTimeMs =
			Date.now() - (request.meta?.startedAtMs || Date.now());

		request.log.info(
			{
				actor: formatActor(request.actor),
				role: request.actor.role,
				name: request.actor.name,
				id: request.actor.id,
				method: request.method,
				url: request.url,
				statusCode: reply.statusCode,
				responseTimeMs,
				ip: request.meta?.ip,
			},
			"request completed"
		);
	});
});