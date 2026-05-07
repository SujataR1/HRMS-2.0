import { prisma } from "#src/db/prisma.js";
export async function getAllEmployeeProfile() {
	return await prisma.$transaction(async (tx) => {
		return await tx.employee.findMany({
			select: {
				employeeId: true,
				name: true,
				assignedEmail: true,
				updatedAt: true,
			},
		});
	});
}
