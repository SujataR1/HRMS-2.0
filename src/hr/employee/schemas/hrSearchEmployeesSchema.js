import { z } from "zod";

export const hrSearchEmployeesSchema = z.object({
  searchText: z.string().min(1, "searchText is required").max(200),
  // optional knobs; defaults are applied inside the method
  limit: z.number().int().min(1).max(100).optional(),
  fuzzyLimit: z.number().min(0.1).max(0.5).optional(),
});
