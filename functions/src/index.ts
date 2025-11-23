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
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "upsert";
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
}

/**
 * Main Supabase proxy function (2nd Gen)
 * Authenticated users only
 */
export const supabaseProxy = onCall(
  {
    secrets: [supabaseUrl, supabaseAnonKey],
    timeoutSeconds: 60,
    memory: "256MiB",
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
      const { table, operation, data: payload, filters, order, limit, range, single, select, match } = data;      // Validate table name (whitelist approach for security)
      const allowedTables = [
        "guests",
        "meal_attendance",
        "shower_reservations",
        "laundry_bookings",
        "bicycle_repairs",
        "holiday_visits",
        "haircut_visits",
        "items_distributed",
        "donations",
        "app_settings",
      ];

      if (!allowedTables.includes(table)) {
        throw new HttpsError(
          "invalid-argument",
          `Table '${table}' is not allowed`
        );
      }

      let query: any;

      switch (operation) {
        case "select": {
          query = supabase.from(table).select(select || "*");

          // Apply filters
          if (filters && Array.isArray(filters)) {
            for (const filter of filters) {
              const { field, operator, value } = filter;
              switch (operator) {
                case "eq":
                  query = query.eq(field, value);
                  break;
                case "neq":
                  query = query.neq(field, value);
                  break;
                case "gt":
                  query = query.gt(field, value);
                  break;
                case "gte":
                  query = query.gte(field, value);
                  break;
                case "lt":
                  query = query.lt(field, value);
                  break;
                case "lte":
                  query = query.lte(field, value);
                  break;
                case "like":
                  query = query.like(field, value);
                  break;
                case "ilike":
                  query = query.ilike(field, value);
                  break;
                case "in":
                  query = query.in(field, value);
                  break;
                case "is":
                  query = query.is(field, value);
                  break;
                default:
                  throw new HttpsError(
                    "invalid-argument",
                    `Operator '${operator}' is not supported`
                  );
              }
            }
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
            for (const filter of filters) {
              query = query.eq(filter.field, filter.value);
            }
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
            for (const filter of filters) {
              query = query.eq(filter.field, filter.value);
            }
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
