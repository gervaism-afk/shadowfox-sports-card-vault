export async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  // Advance by rows received, accommodating project-specific API row caps.
  while (true) {
    const { data, error, count } = await fetchPage(
      rows.length,
      rows.length + 499,
    );
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
    if (typeof count === "number" && rows.length >= count) return rows;
  }
}
