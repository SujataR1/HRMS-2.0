import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function hrUpdateAnEmployee({
	employeeId,
	name = null,
	assignedEmail = null,
}) {
	if (!employeeId || (!name && !assignedEmail)) {
		throw new Error(
			"Invalid request: employeeId and at least one field to update are required"
		);
	}

	return await prisma.$transaction(async (tx) => {
		const data = {};
		if (name) data.name = name;
		if (assignedEmail) data.assignedEmail = assignedEmail;

		return await tx.employee.update({
			where: { employeeId },
			data,
		});
	});
}
