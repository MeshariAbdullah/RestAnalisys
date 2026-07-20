import { z } from "zod";
import { SQL, sql } from "drizzle-orm";

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  input: PaginationInput
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / input.limit);
  return {
    items,
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

export function paginationOffset(input: PaginationInput): { offset: number; limit: number } {
  return {
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
  };
}
