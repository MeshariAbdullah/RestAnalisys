import { z } from "zod";

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

export function paginate(input: PaginationInput) {
  const offset = (input.page - 1) * input.limit;
  return { offset, limit: input.limit, page: input.page };
}

export function paginatedResponse<T>(rows: T[], total: number, input: PaginationInput) {
  const totalPages = Math.ceil(total / input.limit);
  return {
    data: rows,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages,
      hasNext: input.page < totalPages,
      hasPrev: input.page > 1,
    },
  };
}
