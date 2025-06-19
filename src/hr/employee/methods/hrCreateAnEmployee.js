import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export async function hrCreateAnEmployee({
	name,
	employeeId,
	assignedEmail,
	password,
}) {
	if (!name || !employeeId || !assignedEmail || !password) {
		throw new Error(
			"Missing required fields: name, employeeId, assignedEmail, or password"
		);
	}

	const result = await prisma.$transaction(
		async (tx) => {
			const existing = await tx.employee.findFirst({
				where: {
					OR: [{ employeeId }, { assignedEmail }],
				},
			});

			if (existing) {
				throw new Error(
					"Employee already exists with this employeeId or assignedEmail"
				);
			}

			const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

			const created = await tx.employee.create({
				data: {
					name,
					employeeId,
					assignedEmail,
					password: hashedPassword,
				},
			});

			await tx.employeeSettings.create({
			data: {
				employeeId,
				isTwoFA: false,
				sendOTPsToPersonalEmail: false,
			},
			});


			return created;
		},
		{ timeout: 30_000 }
	);

	return result;
}
