import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { createClient } from "@supabase/supabase-js";
import * as admin from "firebase-admin";

admin.initializeApp();

// Define secrets
const supabaseUrl = defineSecret("SUPABASE_URL");
const supabaseAnonKey = defineSecret("SUPABASE_ANON_KEY");

// Initialize Supabase client with secrets
const getSupabaseClient = () => {
  const url = supabaseUrl.value();
  const key = supabaseAnonKey.value();

  if (!url || !key) {
    throw new HttpsError(
      "failed-precondition",
      "Supabase credentials not configured"
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
};

// Type definitions for requests
interface SupabaseQueryRequest {
  table?: string;
  operation: "select" | "insert" | "update" | "delete" | "upsert" | "rpc";
  data?: any;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  order?: {
    field: string;
    ascending?: boolean;
  };
  limit?: number;
  range?: {
    from: number;
    to: number;
  };
  single?: boolean;
  select?: string;
  match?: Record<string, any>;
  // RPC-specific fields
  functionName?: string;
  params?: Record<string, any>;
}

/**
 * Main Supabase proxy function (2nd Gen)
 * Authenticated users only
 */
export const supabaseProxy = onCall(
  {
    secrets: [supabaseUrl, supabaseAnonKey],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to access this function"
      );
    }

      const data = request.data as SupabaseQueryRequest;

    try {
      const supabase = getSupabaseClient();
      const { table, operation, data: payload, filters, order, limit, range, single, select, match, functionName, params } = data;

      // Handle RPC calls separately (don't require table validation)
      if (operation === "rpc") {
        if (!functionName) {
          throw new HttpsError(
            "invalid-argument",
            "Function name is required for RPC calls"
          );
        }

        // Whitelist allowed RPC functions for security
        const allowedFunctions = [
          "guest_needs_waiver_reminder",
          "dismiss_waiver",
          "has_active_waiver",
          "reset_waivers_for_new_year",
        ];

        if (!allowedFunctions.includes(functionName)) {
          throw new HttpsError(
            "invalid-argument",
            `Function '${functionName}' is not allowed`
          );
        }

        const result = await supabase.rpc(functionName, params || {});
        return { data: result.data, error: result.error };
      }

      // Validate table name (whitelist approach for security)
      const allowedTables = [
        "guests",
        "guest_proxies",
        "guest_warnings",
        "guest_reminders",
        "meal_attendance",
        "shower_reservations",
        "laundry_bookings",
        "bicycle_repairs",
        "holiday_visits",
        "haircut_visits",
        "items_distributed",
        "donations",
        "la_plaza_donations",
        "app_settings",
        "service_waivers",
        "blocked_slots",
      ];

      // For non-RPC operations, table is required
      if (!table) {
        throw new HttpsError(
          "invalid-argument",
          "Table name is required for this operation"
        );
      }

      if (!allowedTables.includes(table)) {
        throw new HttpsError(
          "invalid-argument",
          `Table '${table}' is not allowed`
        );
      }

      // Helper to apply filters to a query
      const applyFilters = (q: any, filterList: any[]) => {
        let currentQuery = q;
        for (const filter of filterList) {
          const { field, operator, value } = filter;
          switch (operator) {
            case "eq":
              currentQuery = currentQuery.eq(field, value);
              break;
            case "neq":
              currentQuery = currentQuery.neq(field, value);
              break;
            case "gt":
              currentQuery = currentQuery.gt(field, value);
              break;
            case "gte":
              currentQuery = currentQuery.gte(field, value);
              break;
            case "lt":
              currentQuery = currentQuery.lt(field, value);
              break;
            case "lte":
              currentQuery = currentQuery.lte(field, value);
              break;
            case "like":
              currentQuery = currentQuery.like(field, value);
              break;
            case "ilike":
              currentQuery = currentQuery.ilike(field, value);
              break;
            case "in":
              currentQuery = currentQuery.in(field, value);
              break;
            case "is":
              currentQuery = currentQuery.is(field, value);
              break;
            default:
              throw new HttpsError(
                "invalid-argument",
                `Operator '${operator}' is not supported`
              );
          }
        }
        return currentQuery;
      };

      let query: any;

      switch (operation) {
        case "select": {
          query = supabase.from(table).select(select || "*");

          // Apply filters
          if (filters && Array.isArray(filters)) {
            query = applyFilters(query, filters);
          }

          // Apply ordering
          if (order) {
            query = query.order(order.field, {
              ascending: order.ascending !== false,
              nullsLast: true,
            });
          }

          // Apply range (offset-based pagination)
          if (range) {
            query = query.range(range.from, range.to);
          } else if (limit) {
            // Apply limit only if range is not used
            query = query.limit(limit);
          }

          // Execute query
          if (single) {
            const result = await query.maybeSingle();
            return { data: result.data, error: result.error };
          }

          const result = await query;
          return { data: result.data, error: result.error };
        }

        case "insert": {
          query = supabase.from(table).insert(payload).select();

          if (single) {
            const result = await query.single();
            return { data: result.data, error: result.error };
          }

          const result = await query;
          return { data: result.data, error: result.error };
        }

        case "update": {
          query = supabase.from(table).update(payload);

          // Apply filters for update
          if (filters && Array.isArray(filters)) {
            query = applyFilters(query, filters);
          }

          query = query.select();

          if (single) {
            const result = await query.maybeSingle();
            return { data: result.data, error: result.error };
          }

          const result = await query;
          return { data: result.data, error: result.error };
        }

        case "delete": {
          query = supabase.from(table).delete();

          // Apply filters for delete
          if (filters && Array.isArray(filters)) {
            query = applyFilters(query, filters);
          }

          const result = await query;
          return { data: result.data, error: result.error };
        }

        case "upsert": {
          const onConflict = match ? Object.keys(match)[0] : "id";
          query = supabase.from(table).upsert(payload, { onConflict }).select();

          if (single) {
            const result = await query.maybeSingle();
            return { data: result.data, error: result.error };
          }

          const result = await query;
          return { data: result.data, error: result.error };
        }

        default:
          throw new HttpsError(
            "invalid-argument",
            `Operation '${operation}' is not supported`
          );
      }
    } catch (error: any) {
      console.error("Supabase proxy error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error.message || "An error occurred while processing your request"
      );
    }
  }
);
