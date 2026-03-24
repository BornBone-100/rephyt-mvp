import type { Database as DatabaseGenerated } from "./supabase-generated";

/**
 * 권장:
 * - Supabase 대시보드에서 "Generate types"로 뽑은 타입을 `src/types/supabase-generated.ts`로 두고
 * - 여기서는 앱에서 사용할 alias만 노출
 */
export type Database = DatabaseGenerated;
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

