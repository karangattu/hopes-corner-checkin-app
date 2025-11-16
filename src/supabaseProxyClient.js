import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

/**
 * Supabase Proxy Client
 * Routes all Supabase requests through Firebase Functions to avoid exposing credentials
 */
class SupabaseProxyClient {
  constructor() {
    // Lazily obtain a functions instance to avoid calling Firebase APIs at import time,
    // which can fail in test environments where `app` isn't initialized (CI).
    try {
      this.functions = getFunctions(app);
      this.proxyFunction = httpsCallable(this.functions, "supabaseProxy");
    } catch (e) {
      // If there is no initialized Firebase app, keep a noop function that throws when used.
      // Log the error for debugging in CI environments.
      console.warn("SupabaseProxyClient: Firebase functions initialization failed:", e);
      this.functions = null;
      this.proxyFunction = async () => {
        throw new Error("Supabase proxy is not available: Firebase app not initialized.");
      };
    }
  }

  /**
   * Create a table query builder
   */
  from(table) {
    return new TableQueryBuilder(this.proxyFunction, table);
  }
}

class TableQueryBuilder {
  constructor(proxyFunction, table) {
    this.proxyFunction = proxyFunction;
    this.table = table;
    this.queryConfig = {
      table,
      operation: "select",
      filters: [],
      select: "*",
    };
  }

  /**
   * Select specific columns
   */
  select(columns = "*") {
    this.queryConfig.select = columns;
    return this;
  }

  /**
   * Insert data
   */
  insert(data) {
    this.queryConfig.operation = "insert";
    this.queryConfig.data = data;
    return this;
  }

  /**
   * Update data
   */
  update(data) {
    this.queryConfig.operation = "update";
    this.queryConfig.data = data;
    return this;
  }

  /**
   * Delete data
   */
  delete() {
    this.queryConfig.operation = "delete";
    return this;
  }

  /**
   * Upsert data
   */
  upsert(data, options = {}) {
    this.queryConfig.operation = "upsert";
    this.queryConfig.data = data;
    this.queryConfig.match = options.onConflict
      ? { [options.onConflict]: true }
      : undefined;
    return this;
  }

  /**
   * Filter: equals
   */
  eq(field, value) {
    this.queryConfig.filters.push({ field, operator: "eq", value });
    return this;
  }

  /**
   * Filter: not equals
   */
  neq(field, value) {
    this.queryConfig.filters.push({ field, operator: "neq", value });
    return this;
  }

  /**
   * Filter: greater than
   */
  gt(field, value) {
    this.queryConfig.filters.push({ field, operator: "gt", value });
    return this;
  }

  /**
   * Filter: greater than or equal
   */
  gte(field, value) {
    this.queryConfig.filters.push({ field, operator: "gte", value });
    return this;
  }

  /**
   * Filter: less than
   */
  lt(field, value) {
    this.queryConfig.filters.push({ field, operator: "lt", value });
    return this;
  }

  /**
   * Filter: less than or equal
   */
  lte(field, value) {
    this.queryConfig.filters.push({ field, operator: "lte", value });
    return this;
  }

  /**
   * Filter: like (pattern matching)
   */
  like(field, value) {
    this.queryConfig.filters.push({ field, operator: "like", value });
    return this;
  }

  /**
   * Filter: case-insensitive like
   */
  ilike(field, value) {
    this.queryConfig.filters.push({ field, operator: "ilike", value });
    return this;
  }

  /**
   * Filter: in array
   */
  in(field, values) {
    this.queryConfig.filters.push({ field, operator: "in", value: values });
    return this;
  }

  /**
   * Filter: is null/not null
   */
  is(field, value) {
    this.queryConfig.filters.push({ field, operator: "is", value });
    return this;
  }

  /**
   * Order results
   */
  order(field, options = {}) {
    this.queryConfig.order = {
      field,
      ascending: options.ascending !== false,
    };
    return this;
  }

  /**
   * Limit results
   */
  limit(count) {
    this.queryConfig.limit = count;
    return this;
  }

  /**
   * Return single result (throws error if multiple)
   */
  async single() {
    this.queryConfig.single = true;
    const result = await this.execute();
    return result;
  }

  /**
   * Return single result or null (doesn't throw)
   */
  async maybeSingle() {
    this.queryConfig.single = true;
    const result = await this.execute();
    return result;
  }

  /**
   * Execute the query
   */
  async execute() {
    try {
      const response = await this.proxyFunction(this.queryConfig);
      return {
        data: response.data.data,
        error: response.data.error,
      };
    } catch (error) {
      console.error("Supabase proxy error:", error);

      // Check for authentication errors
      if (error.code === "functions/unauthenticated") {
        console.error("⚠️ Not authenticated with Firebase. Please log in to sync data.");
        return {
          data: null,
          error: {
            message: "Authentication required. Please log in to access the database.",
            code: "UNAUTHENTICATED",
          },
        };
      }

      return {
        data: null,
        error: {
          message: error.message || "Unknown error occurred",
          code: error.code,
        },
      };
    }
  }

  /**
   * Default execution (returns promise)
   */
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

// Create and export the proxy client
const isSupabaseProxyEnabled = Boolean(import.meta.env.VITE_USE_SUPABASE_PROXY === "true");

export const isSupabaseProxyAvailable = isSupabaseProxyEnabled;
export const supabaseProxy = isSupabaseProxyEnabled ? new SupabaseProxyClient() : null;

export default supabaseProxy;
