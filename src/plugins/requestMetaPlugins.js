import fp from "fastify-plugin";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const AES_SECRET = process.env.AES_SECRET;
const AES_ALGO = "aes-256-cbc";

const hrEmployeeIdCache = new Map();

function getMetaFromRequest(request) {
	return {
		ip: request.ip,
		ua: request.headers["user-agent"] || "",
		ref: request.headers["referer"] || "",
	};
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

async function getHrEmployeeId(fastify, hrId) {
	if (!hrId) return null;

	if (hrEmployeeIdCache.has(hrId)) {
		return hrEmployeeIdCache.get(hrId);
	}

	try {
		const hr = await fastify.prisma.hr.findUnique({
			where: {
				id: hrId,
			},
			select: {
				employeeId: true,
			},
		});

		const employeeId = hr?.employeeId || null;
		hrEmployeeIdCache.set(hrId, employeeId);

		return employeeId;
	} catch {
		return null;
	}
}

async function resolveRequestActor(fastify, request) {
	const token = extractBearerToken(request.headers.authorization || "");

	if (!token) {
		return {
			role: "unauthenticated",
			actorId: null,
			employeeId: null,
			adminId: null,
			hrId: null,
		};
	}

	const jwtToken = resolveJwtTokenFromBearerToken(token);
	const decoded = verifyJwtForLogging(jwtToken);

	if (!decoded || typeof decoded !== "object") {
		return {
			role: "unknown",
			actorId: null,
			employeeId: null,
			adminId: null,
			hrId: null,
		};
	}

	if (decoded.adminId) {
		return {
			role: "admin",
			actorId: decoded.adminId,
			employeeId: null,
			adminId: decoded.adminId,
			hrId: null,
		};
	}

	if (decoded.hrId) {
		const employeeId = await getHrEmployeeId(fastify, decoded.hrId);

		return {
			role: "hr",
			actorId: decoded.hrId,
			employeeId,
			adminId: null,
			hrId: decoded.hrId,
		};
	}

	if (decoded.employeeId) {
		return {
			role: "employee",
			actorId: decoded.employeeId,
			employeeId: decoded.employeeId,
			adminId: null,
			hrId: null,
		};
	}

	return {
		role: "unknown",
		actorId: null,
		employeeId: null,
		adminId: null,
		hrId: null,
	};
}

export default fp(async function requestMetaPlugin(fastify) {
	fastify.addHook("onRequest", async (request, _reply) => {
		request.meta = {
			...getMetaFromRequest(request),
			startedAtMs: Date.now(),
		};

		request.actor = {
			role: "unresolved",
			actorId: null,
			employeeId: null,
			adminId: null,
			hrId: null,
		};
	});

	fastify.addHook("preHandler", async (request, _reply) => {
		try {
			request.actor = await resolveRequestActor(fastify, request);
			request.meta.actor = request.actor;
		} catch {
			request.actor = {
				role: "unknown",
				actorId: null,
				employeeId: null,
				adminId: null,
				hrId: null,
			};

			request.meta.actor = request.actor;
		}
	});

	fastify.addHook("onResponse", async (request, reply) => {
		const responseTimeMs = Date.now() - (request.meta?.startedAtMs || Date.now());

		request.log.info(
			{
				actor: request.actor,
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