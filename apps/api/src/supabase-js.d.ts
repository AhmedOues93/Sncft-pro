declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string, options?: Record<string, unknown>): any;
}
