import fastifyStatic from "@fastify/static";
import { AdminOTPPurpose, PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import path from "path";
import { fileURLToPath } from "url";
import requestMetaPlugin from "./src/plugins/requestMetaPlugins.js";
import { gracefulAuditShutdown } from "./src/utils/logging/methods/logQueue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import handleGetRequestRoute from "./src/biometric-access-machine/routes/handleGetRequestRoute.js";
import postBiometricLogsRoute from "./src/biometric-access-machine/routes/handlePostBiometricLogsRoute.js";

import adminCreateManualAttendanceEntryRoute from "./src/admin/attendance/routes/adminCreateManualAttendanceEntryRoute.js";
import adminGenerateAndSendMonthlyReportsRoute from "./src/admin/attendance/routes/adminGenerateAndSendMonthlyReportsRoute.js";
import adminGetEmployeeAttendanceRoute from "./src/admin/attendance/routes/adminGetEmployeeAttendanceRoute.js";
import adminLoginRoute from "./src/admin/auth/routes/adminLoginRoute.js";
import adminLogoutRoute from "./src/admin/auth/routes/adminLogoutRoute.js";
import adminCreateRoute from "./src/admin/creation/routes/adminCreateRoute.js";
import adminActOnUserInfraRequestRoute from "./src/admin/infra-requests/routes/adminActOnUserInfraRequestRoute.js";
import adminGetUserInfraRequestsRoute from "./src/admin/infra-requests/routes/adminGetUserInfraRequestsRoute.js";
import adminDemoteHRRoute from "./src/admin/miscellaneous/routes/adminDemoteHRRoute.js";
import adminPromoteEmployeeToHRRoute from "./src/admin/miscellaneous/routes/adminPromoteEmployeeToHRRoute.js";
import adminRevokeAllActiveSessionsRoute from "./src/admin/miscellaneous/routes/adminRevokeAllActiveSessionsRoute.js";
import adminGetProfileRoute from "./src/admin/profile/routes/adminGetProfileRoute.js";
import adminUpdateProfileRoute from "./src/admin/profile/routes/adminUpdateProfileRoute.js";
import adminChangePasswordRoute from "./src/admin/secondary-authentication/routes/adminChangePasswordRoute.js";
import adminRequestAPasswordResetRoute from "./src/admin/secondary-authentication/routes/adminRequestAPasswordResetRoute.js";
import adminRequestEmailVerificationRoute from "./src/admin/secondary-authentication/routes/adminRequestEmailVerificationRoute.js";
import adminResetPasswordRoute from "./src/admin/secondary-authentication/routes/adminResetPasswordRoute.js";
import adminMakeOrRefreshEmployeeAttendanceRoute from "./src/admin/attendance/routes/adminMakeOrRefreshEmployeeAttendanceRoute.js";
import adminVerify2FAAndLoginRoute from "./src/admin/secondary-authentication/routes/adminVerify2FAAndLoginRoute.js";
import adminVerifyEmailRoute from "./src/admin/secondary-authentication/routes/adminVerifyEmailRoute.js";
import adminGetSettingsRoute from "./src/admin/settings/routes/adminGetSettingsRoute.js";
import adminToggle2FARoute from "./src/admin/settings/routes/adminToggle2FARoute.js";
import adminCreateAnEmployeeRoute from "./src/admin/employee/routes/adminCreateAnEmployeeRoute.js";
import adminAssignAnEmployeeAShiftRoute from "./src/admin/employee/routes/adminAssignAnEmployeeAShiftRoute.js";
import adminCreateEmployeeDetailsRoute from "./src/admin/employee/routes/adminCreateEmployeeDetailsRoute.js";
import adminGetAllEmployeeProfileRoute from "./src/admin/employee/routes/adminGetAllEmployeeProfileRoute.js";
import adminGetEmployeeDetailsRoute from "./src/admin/employee/routes/adminGetEmployeeDetailsRoute.js";
import adminUpdateAnEmployeeRoute from "./src/admin/employee/routes/adminUpdateAnEmployeeRoute.js";
import adminUpdateEmployeeDetailsRoute from "./src/admin/employee/routes/adminUpdateEmployeeDetailsRoute.js";

import adminEditAnAttendanceEntryRoute from "./src/admin/attendance/routes/adminEditAnAttendanceEntryRoute.js";
import hrLoginRoute from "./src/hr/auth/routes/hrLoginRoute.js";
import hrLogoutRoute from "./src/hr/auth/routes/hrLogoutRoute.js";
import hrAssignAnEmployeeAShiftRoute from "./src/hr/employee/routes/hrAssignAnEmployeeAShiftRoute.js";
import hrCreateAnEmployeeRoute from "./src/hr/employee/routes/hrCreateAnEmployeeRoute.js";
import hrCreateEmployeeDetailsRoute from "./src/hr/employee/routes/hrCreateEmployeeDetailsRoute.js";
import hrGetAllEmployeeProfileRoute from "./src/hr/employee/routes/hrGetAllEmployeeProfileRoute.js";
import hrGetEmployeeDetailsRoute from "./src/hr/employee/routes/hrGetEmployeeDetailsRoute.js";
import hrUpdateAnEmployeeRoute from "./src/hr/employee/routes/hrUpdateAnEmployeeRoute.js";
import hrUpdateEmployeeDetailsRoute from "./src/hr/employee/routes/hrUpdateEmployeeDetailsRoute.js";
import hrCreateAHolidayRoute from "./src/hr/holidays/routes/hrCreateAHolidayEntryRoute.js";
import hrChangePasswordRoute from "./src/hr/secondary-authentication/routes/hrChangePasswordRoute.js";
import hrRequestAPasswordResetRoute from "./src/hr/secondary-authentication/routes/hrRequestAPasswordResetRoute.js";
import hrResetPasswordRoute from "./src/hr/secondary-authentication/routes/hrResetPasswordRoute.js";
import hrVerify2FAAndLoginRoute from "./src/hr/secondary-authentication/routes/hrVerify2FAAndLoginRoute.js";
import hrCreateAShiftRoute from "./src/hr/shifts/routes/hrCreateAShiftRoute.js";
import hrGetAllShiftsRoute from "./src/hr/shifts/routes/hrGetAllShiftsRoute.js";
import hrGetProfileRoute from "./src/hr/profile/routes/hrGetProfileRoute.js";
import hrGetEmployeeAttendanceRoute from "./src/hr/attendance/routes/hrGetEmployeeAttendanceRoute.js";
import hrEditAnAttendanceEntryRoute from "./src/hr/attendance/routes/hrEditAnAttendanceEntryRoute.js";
import hrGetHolidayEntriesRoute from "./src/hr/holidays/routes/hrGetHolidayEntriesRoute.js";
import hrEditAHolidayEntryRoute from "./src/hr/holidays/routes/hrEditAHolidayEntryRoute.js";

import employeeLoginRoute from "./src/employee/auth/routes/employeeLoginRoute.js";
import employeeLogoutRoute from "./src/employee/auth/routes/employeeLogoutRoute.js";
import employeeChangePasswordRoute from "./src/employee/secondary-authentication/routes/employeeChangePasswordRoute.js";
import employeeRequestAPasswordResetRoute from "./src/employee/secondary-authentication/routes/employeeRequestAPasswordResetRoute.js";
import employeeResetPasswordRoute from "./src/employee/secondary-authentication/routes/employeeResetPasswordRoute.js";
import employeeVerify2FAAndLoginRoute from "./src/employee/secondary-authentication/routes/employeeVerify2FAAndLoginRoute.js";

const prisma = new PrismaClient();

const app = Fastify({
	trustProxy: true,
	logger: {
		level: "info",
		transport: {
			target: "pino-pretty",
		},
	},
});

app.decorate("prisma", prisma);

app.register(requestMetaPlugin);

app.register(fastifyCors, {
  origin: true,
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
    "CONNECT",
    "TRACE"
  ],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
	"authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
	"user-agent",
	"referer"
  ],
});

app.register(fastifyStatic, {
	root: path.join(__dirname, "media"),
	prefix: "/media/",
});

process.on("SIGINT", async () => {
	console.log("🛑 SIGINT received. Flushing audit log queue...");
	await gracefulAuditShutdown();
	console.log("✅ Audit queue flushed. Exiting now.");
	process.exit(0);
});

app.get("/", async (req, reply) => {
	return reply.code(200).send("This is the HRMS backend!");
});

app.get("/favicon.ico", async (req, reply) => {
	return reply.sendFile("favicon.ico");
});

// await app.register(handleHeartBeatRoute);
await app.register(postBiometricLogsRoute);
await app.register(handleGetRequestRoute);

await app.register(adminCreateRoute);
await app.register(adminLoginRoute);
await app.register(adminLogoutRoute);
await app.register(adminGetSettingsRoute);
await app.register(adminToggle2FARoute);
await app.register(adminVerify2FAAndLoginRoute);
await app.register(adminRequestAPasswordResetRoute);
await app.register(adminResetPasswordRoute);
await app.register(adminRequestEmailVerificationRoute);
await app.register(adminVerifyEmailRoute);
await app.register(adminChangePasswordRoute);
await app.register(adminGetProfileRoute);
await app.register(adminUpdateProfileRoute);
await app.register(adminRevokeAllActiveSessionsRoute);
await app.register(adminGetEmployeeAttendanceRoute);
await app.register(adminGenerateAndSendMonthlyReportsRoute);
await app.register(adminPromoteEmployeeToHRRoute);
await app.register(adminDemoteHRRoute);
await app.register(adminEditAnAttendanceEntryRoute);
await app.register(adminCreateManualAttendanceEntryRoute);
await app.register(adminGetUserInfraRequestsRoute);
await app.register(adminActOnUserInfraRequestRoute);
await app.register(adminCreateAnEmployeeRoute)
await app.register(adminAssignAnEmployeeAShiftRoute);
await app.register(adminCreateEmployeeDetailsRoute);
await app.register(adminGetAllEmployeeProfileRoute);
await app.register(adminGetEmployeeDetailsRoute);
await app.register(adminMakeOrRefreshEmployeeAttendanceRoute);
await app.register(adminUpdateAnEmployeeRoute);
await app.register(adminUpdateEmployeeDetailsRoute);

await app.register(hrCreateAnEmployeeRoute);
await app.register(hrCreateAHolidayRoute);
await app.register(hrCreateAShiftRoute);
await app.register(hrUpdateAnEmployeeRoute);
await app.register(hrCreateEmployeeDetailsRoute);
await app.register(hrUpdateEmployeeDetailsRoute);
await app.register(hrGetAllEmployeeProfileRoute);
await app.register(hrGetEmployeeDetailsRoute);
await app.register(hrGetAllShiftsRoute);
await app.register(hrAssignAnEmployeeAShiftRoute);
await app.register(hrLoginRoute);
await app.register(hrLogoutRoute);
await app.register(hrVerify2FAAndLoginRoute);
await app.register(hrRequestAPasswordResetRoute);
await app.register(hrResetPasswordRoute);
await app.register(hrChangePasswordRoute);
await app.register(hrGetProfileRoute);
await app.register(hrGetEmployeeAttendanceRoute);
await app.register(hrEditAnAttendanceEntryRoute);
await app.register(hrGetHolidayEntriesRoute);
await app.register(hrEditAHolidayEntryRoute);

await app.register(employeeLoginRoute);
await app.register(employeeLogoutRoute);
await app.register(employeeChangePasswordRoute);
await app.register(employeeRequestAPasswordResetRoute);
await app.register(employeeResetPasswordRoute);
await app.register(employeeVerify2FAAndLoginRoute);

const PORT = process.env.PORT || 3000;

try {
	await app.listen({ port: PORT, host: "0.0.0.0" });
	app.log.info(`🔥 The server is live`);
} catch (err) {
	app.log.error({ err }, "❌ Failed to start server");
	process.exit(1);
}

process.on("SIGTERM", async () => {
	console.log("🛑 SIGTERM received. Flushing audit log queue...");
	await gracefulAuditShutdown();
	console.log("✅ Audit queue flushed. Exiting now.");
	process.exit(0);
});
