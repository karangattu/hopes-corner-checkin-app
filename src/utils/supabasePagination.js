/**
 * Paginated Supabase fetch helper for large tables.
 * Uses offset-based pagination with a configurable page size and optional filters.
 * Accepts an optional mapper to transform rows and an onPage callback to stream results.
 */
export const fetchAllPaginated = async (
  client,
  {
    table,
    select = "*",
    pageSize = 1000,
    orderBy = "created_at",
    ascending = false,
    filters = [],
    sinceColumn,
    sinceValue,
    mapper,
    onPage,
    maxPages,
  },
) => {
  if (!client) return [];
  if (!table) throw new Error("Table name is required for paginated fetch");

  const results = [];
  let offset = 0;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = client.from(table).select(select);

    if (orderBy) {
      query = query.order(orderBy, { ascending, nullsLast: true });
    }

    if (sinceColumn && sinceValue) {
      query = query.gte(sinceColumn, sinceValue);
    }

    if (Array.isArray(filters)) {
      filters.forEach((filter) => {
        if (!filter || !filter.column || !filter.op) return;
        const op = filter.op;
        const value = filter.value;

        if (typeof query[op] === "function") {
          query = query[op](filter.column, value);
        }
      });
    }

    query = query.range(offset, offset + pageSize - 1);

    // Supabase query builders are thenable; await works directly.
    const { data, error } = await query;
    if (error) throw error;

    const pageRows = Array.isArray(data) ? data : [];
    const mappedRows = mapper ? pageRows.map(mapper) : pageRows;

    results.push(...mappedRows);
    if (onPage) onPage(mappedRows, { page, offset });

    offset += pageSize;
    page += 1;

    if (pageRows.length < pageSize) {
      hasMore = false;
    }

    if (maxPages && page >= maxPages) {
      hasMore = false;
    }
  }

  return results;
};

export default fetchAllPaginated;
