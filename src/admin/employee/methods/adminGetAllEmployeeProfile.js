import { prisma } from "#src/db/prisma.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function isPaginationRequested({ page, limit } = {}) {
	return page !== undefined || limit !== undefined;
}

function normalizePagination({ page, limit } = {}) {
	const parsedPage = Number(page);
	const parsedLimit = Number(limit);

	const safePage =
		Number.isInteger(parsedPage) && parsedPage > 0
			? parsedPage
			: DEFAULT_PAGE;

	const safeLimit =
		Number.isInteger(parsedLimit) && parsedLimit > 0
			? Math.min(parsedLimit, MAX_LIMIT)
			: DEFAULT_LIMIT;

	return {
		page: safePage,
		limit: safeLimit,
		skip: (safePage - 1) * safeLimit,
	};
}

async function attachEmployeeDetails(employees) {
	const employeeIds = employees.map((employee) => employee.employeeId);

	const detailsList = employeeIds.length
		? await prisma.employeeDetails.findMany({
				where: {
					employeeId: {
						in: employeeIds,
					},
				},
			})
		: [];

	const detailsMap = new Map(
		detailsList.map((detail) => [detail.employeeId, detail])
	);

	return employees.map((employee) => ({
		...employee,
		employeeDetails: detailsMap.get(employee.employeeId) || null,
	}));
}

/**
 * Live-safe behavior:
 *
 * - No pagination query params: preserves old behavior and returns full array.
 * - page/limit present: returns paginated object.
 */
export async function adminGetAllEmployeeProfile({ page, limit } = {}) {
	if (!isPaginationRequested({ page, limit })) {
		const [employees, detailsList] = await Promise.all([
			prisma.employee.findMany(),
			prisma.employeeDetails.findMany(),
		]);

		const detailsMap = new Map(
			detailsList.map((detail) => [detail.employeeId, detail])
		);

		return employees.map((employee) => ({
			...employee,
			employeeDetails: detailsMap.get(employee.employeeId) || null,
		}));
	}

	const pagination = normalizePagination({ page, limit });

	const [employees, total] = await Promise.all([
		prisma.employee.findMany({
			orderBy: {
				employeeId: "asc",
			},
			skip: pagination.skip,
			take: pagination.limit,
		}),

		prisma.employee.count(),
	]);

	const data = await attachEmployeeDetails(employees);
	const totalPages = Math.ceil(total / pagination.limit);

	return {
		data,
		pagination: {
			page: pagination.page,
			limit: pagination.limit,
			total,
			totalPages,
			hasNextPage: pagination.page < totalPages,
			hasPreviousPage: pagination.page > 1,
		},
	};
}