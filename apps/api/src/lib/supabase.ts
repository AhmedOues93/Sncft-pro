import { createClient } from '@supabase/supabase-js';

import { config } from '../config.js';

export interface SupabaseChain<T = unknown> {
  select(columns?: string): SupabaseChain<T>;
  insert(values: Record<string, unknown> | Array<Record<string, unknown>>): SupabaseChain<T>;
  update(values: Record<string, unknown>): SupabaseChain<T>;
  eq(column: string, value: unknown): SupabaseChain<T>;
  neq(column: string, value: unknown): SupabaseChain<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseChain<T>;
  limit(count: number): SupabaseChain<T>;
  single(): Promise<{ data: T | null; error: { message: string } | null }>;
  maybeSingle(): Promise<{ data: T | null; error: { message: string } | null }>;
  then?: Promise<unknown>['then'];
}

export interface SupabaseLikeClient {
  from<T = unknown>(table: string): SupabaseChain<T>;
}

let cachedClient: SupabaseLikeClient | null = null;

export function getSupabaseServerClient(): SupabaseLikeClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for persistence endpoints');
  }

  if (!cachedClient) {
    cachedClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!cachedClient) {
    throw new Error('Failed to create Supabase client');
  }

  return cachedClient;
}

export function setSupabaseClientForTests(client: SupabaseLikeClient | null) {
  cachedClient = client;
}
