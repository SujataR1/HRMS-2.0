import fs from "fs";
import path from "path";
import dayjs from "dayjs"; // If not already imported
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { verifyEmployeeJWT } from "../../employee-session-management/methods/employeeSessionManagementMethods.js";
import { sendEmployeeMailWithAttachments } from "../../mailer/methods/employeeMailer.js";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "media", "leave-attachments");

export async function employeeUploadLeaveAttachments(authHeader, { leaveId, files }) {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		throw new Error("Authorization header missing or invalid");
	}

	const { employeeId } = await verifyEmployeeJWT(authHeader);

	const leave = await prisma.leave.findUnique({
		where: { id: leaveId },
	});

	if (!leave) throw new Error("Leave not found");

	if (leave.employeeId !== employeeId) {
		throw new Error("You are not authorized to upload to this leave");
	}

	if (leave.status !== "pending") {
		throw new Error("Attachments can only be uploaded for pending leaves");
	}

	if (dayjs().isAfter(leave.toDate)) {
	throw new Error("Cannot edit leave notes after the leave's end date");
	}

	if (!Array.isArray(files) || files.length === 0) {
		throw new Error("No files uploaded");
	}

	if (!fs.existsSync(UPLOAD_DIR)) {
		fs.mkdirSync(UPLOAD_DIR, { recursive: true });
	}

	const savedPaths = [];
	const attachmentsToSend = [];

	for (const file of files) {
		const ext = path.extname(file.filename);
		const filename = `${employeeId}-${Date.now()}-${randomUUID()}${ext}`;
		const savePath = path.join(UPLOAD_DIR, filename);

		await file.toFile(savePath);
		const relativePath = `/media/leave-attachments/${filename}`;
		savedPaths.push(relativePath);
			attachmentsToSend.push({
			filename: file.filename,
			path: savePath,
		});
	}

	// Create or update attachment record
	const existing = await prisma.leaveAttachments.findUnique({
		where: { leaveId },
	});

	if (existing) {
		await prisma.leaveAttachments.update({
			where: { leaveId },
			data: { attachmentPaths: savedPaths },
		});
	} else {
		await prisma.leaveAttachments.create({
			data: { leaveId, attachmentPaths: savedPaths },
		});
	}

	const employee = await prisma.employee.findUnique({
		where: { employeeId: employeeId },
		select: {
			name: true,
			assignedEmail: true,
		},
	});

	if (employee?.assignedEmail) {
		await sendEmployeeMailWithAttachments({
			to: employee.assignedEmail,
			purpose: "leave-attachments-uploaded",
			payload: {
				subject: "Your leave attachments have been uploaded",
				name: employee.name,
				leaveId,
				fromDate: dayjs(leave.fromDate).format("YYYY-MM-DD"),
				toDate: dayjs(leave.toDate).format("YYYY-MM-DD"),
				leaveType: leave.leaveType.join(", "),
				status: leave.status,
				applicationNotes: leave.applicationNotes || "-",
				otherTypeDescription: leave.otherTypeDescription || "-",
			},
			attachments: attachmentsToSend,
		});
	}

	return {
		success: true,
		message: "Attachments uploaded successfully",
		paths: savedPaths,
	};
}
