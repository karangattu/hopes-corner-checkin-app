import { describe, it, expect, vi } from 'vitest';
import { fetchAllPaginated } from '../supabasePagination';

const createFakeClient = (rows) => {
  const calls = [];

  return {
    calls,
    from: () => {
      let selectValue = '*';
      let orderField = null;
      let orderAscending = false;
      let gteField = null;
      let gteValue = null;
      let rangeFrom = 0;
      let rangeTo = 0;

      const builder = {
        select(value) {
          selectValue = value;
          return this;
        },
        order(field, opts = {}) {
          orderField = field;
          orderAscending = Boolean(opts.ascending);
          return this;
        },
        gte(field, value) {
          gteField = field;
          gteValue = value;
          return this;
        },
        range(from, to) {
          rangeFrom = from;
          rangeTo = to;
          return this;
        },
        then(resolve) {
          const sliced = rows.slice(rangeFrom, rangeTo + 1);
          calls.push({ selectValue, orderField, orderAscending, gteField, gteValue, rangeFrom, rangeTo, count: sliced.length });
          return Promise.resolve(resolve({ data: sliced, error: null }));
        },
      };

      return builder;
    },
  };
};

describe('fetchAllPaginated', () => {
  it('fetches all pages until depleted', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 }));
    const client = createFakeClient(rows);

    const result = await fetchAllPaginated(client, {
      table: 'guests',
      select: 'id',
      pageSize: 1000,
      orderBy: 'created_at',
    });

    expect(result).toHaveLength(2500);
    expect(client.calls).toHaveLength(3); // 0-999, 1000-1999, 2000-2999
    expect(client.calls[0].rangeFrom).toBe(0);
    expect(client.calls[0].rangeTo).toBe(999);
    expect(client.calls[2].rangeFrom).toBe(2000);
    expect(client.calls[2].count).toBe(500);
  });

  it('applies mapper to each page', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const client = createFakeClient(rows);

    const result = await fetchAllPaginated(client, {
      table: 'guests',
      select: 'id',
      pageSize: 2,
      mapper: (row) => ({ ...row, mapped: true }),
    });

    expect(result.every((r) => r.mapped)).toBe(true);
  });

  it('invokes onPage callback with metadata', async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({ id: i + 1 }));
    const client = createFakeClient(rows);
    const onPage = vi.fn();

    await fetchAllPaginated(client, {
      table: 'guests',
      select: 'id',
      pageSize: 2,
      onPage,
    });

    expect(onPage).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ page: 0, offset: 0 }),
    );
    expect(onPage).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ page: 1, offset: 2 }),
    );
  });
});
