import fastifyStatic from "@fastify/static";
import { PrismaClient } from "@prisma/client";
import Fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import handleGetRequestRoute from "./src/biometric-access-machine/routes/handleGetRequestRoute.js";
import postBiometricLogsRoute from "./src/biometric-access-machine/routes/handlePostBiometricLogsRoute.js";

import adminCreateManualAttendanceEntryRoute from "./src/admin/attendance/routes/adminCreateManualAttendanceEntryRoute.js";
import adminGenerateAndSendMonthlyReportsRoute from "./src/admin/attendance/routes/adminGenerateAndSendMonthlyReportsRoute.js";
import adminGetEmployeeAttendanceRoute from "./src/admin/attendance/routes/adminGetEmployeeAttendanceRoute.js";
import adminMakeOrRefreshEmployeeAttendanceRoute from "./src/admin/attendance/routes/adminMakeOrRefreshEmployeeAttendanceRoute.js";
import adminLoginRoute from "./src/admin/auth/routes/adminLoginRoute.js";
import adminLogoutRoute from "./src/admin/auth/routes/adminLogoutRoute.js";
import adminCreateRoute from "./src/admin/creation/routes/adminCreateRoute.js";
import adminDemoteHRRoute from "./src/admin/miscellaneous/routes/adminDemoteHRRoute.js";
import adminPromoteEmployeeToHRRoute from "./src/admin/miscellaneous/routes/adminPromoteEmployeeToHRRoute.js";
import adminRevokeAllActiveSessionsRoute from "./src/admin/miscellaneous/routes/adminRevokeAllActiveSessionsRoute.js";
import adminGetProfileRoute from "./src/admin/profile/routes/adminGetProfileRoute.js";
import adminUpdateProfileRoute from "./src/admin/profile/routes/adminUpdateProfileRoute.js";
import adminChangePasswordRoute from "./src/admin/secondary-authentication/routes/adminChangePasswordRoute.js";
import adminRequestAPasswordResetRoute from "./src/admin/secondary-authentication/routes/adminRequestAPasswordResetRoute.js";
import adminRequestEmailVerificationRoute from "./src/admin/secondary-authentication/routes/adminRequestEmailVerificationRoute.js";
import adminResetPasswordRoute from "./src/admin/secondary-authentication/routes/adminResetPasswordRoute.js";
import adminVerify2FAAndLoginRoute from "./src/admin/secondary-authentication/routes/adminVerify2FAAndLoginRoute.js";
import adminVerifyEmailRoute from "./src/admin/secondary-authentication/routes/adminVerifyEmailRoute.js";
import adminGetSettingsRoute from "./src/admin/settings/routes/adminGetSettingsRoute.js";
import adminToggle2FARoute from "./src/admin/settings/routes/adminToggle2FARoute.js";

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
import hrCreateAShiftRoute from "./src/hr/shifts/routes/hrCreateAShiftRoute.js";
import hrGetAllShiftsRoute from "./src/hr/shifts/routes/hrGetAllShiftsRoute.js";

const prisma = new PrismaClient();

const app = Fastify({
	logger: {
		level: "info",
		transport: {
			target: "pino-pretty",
		},
	},
});

app.decorate("prisma", prisma);

app.register(fastifyStatic, {
	root: path.join(__dirname, "media"),
	prefix: "/media/",
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
await app.register(adminMakeOrRefreshEmployeeAttendanceRoute);
await app.register(adminGetEmployeeAttendanceRoute);
await app.register(adminGenerateAndSendMonthlyReportsRoute);
await app.register(adminPromoteEmployeeToHRRoute);
await app.register(adminDemoteHRRoute);
await app.register(adminEditAnAttendanceEntryRoute);
await app.register(adminCreateManualAttendanceEntryRoute);

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

const PORT = process.env.PORT || 3000;

try {
	await app.listen({ port: PORT, host: "0.0.0.0" });
	app.log.info(`🔥 The server is live`);
} catch (err) {
	app.log.error({ err }, "❌ Failed to start server");
	process.exit(1);
}
