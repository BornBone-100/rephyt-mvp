import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from "@/lib/supabase";

const bodySchema = z.object({
  expectedUrl: z.string().url().optional(),
  expectedAnonKey: z.string().min(1).optional(),
});

function mask(value: string) {
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const { expectedUrl, expectedAnonKey } = bodySchema.parse(json);

    const { url, anonKey } = getSupabasePublicConfig();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    const match = {
      url: expectedUrl ? url === expectedUrl : null,
      anonKey: expectedAnonKey ? anonKey === expectedAnonKey : null,
    };

    return NextResponse.json(
      {
        ok: true,
        runtime: {
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
          SUPABASE_SERVICE_ROLE_KEY: mask(serviceRoleKey),
        },
        compare: {
          expectedUrl: expectedUrl ?? null,
          expectedAnonKey: expectedAnonKey ? mask(expectedAnonKey) : null,
          strictEqual: match,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
