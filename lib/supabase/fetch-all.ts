/**
 * Supabase/PostgREST returns at most 1000 rows per request by default.
 * Page through `.range()` until all matching rows are loaded.
 */
export async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      if (rows.length === 0) {
        throw new Error(error.message ?? "Failed to load paginated rows.");
      }
      break;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;

    // Safety cap: 200 pages × 1000 = 200k rows
    if (from >= pageSize * 200) break;
  }

  return rows;
}
