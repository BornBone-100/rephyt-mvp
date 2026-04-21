import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type LemonSqueezyWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      user_id?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  data?: {
    attributes?: {
      user_email?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function verifyLemonSqueezySignature(rawBody: string, signature: string, secret: string) {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature, "utf8");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function getUserIdFromPayload(payload: LemonSqueezyWebhookPayload) {
  const direct = payload.meta?.custom_data?.user_id;
  if (direct && typeof direct === "string") return direct;

  const nested = (payload.data?.attributes as { custom_data?: { user_id?: string } } | undefined)?.custom_data
    ?.user_id;
  if (nested && typeof nested === "string") return nested;

  return null;
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-signature");
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 401 });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase server credentials" }, { status: 500 });
  }

  try {
    const rawBody = await request.text();
    const isValid = verifyLemonSqueezySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
    const eventName = payload.meta?.event_name;
    if (eventName !== "order_created" && eventName !== "subscription_created") {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    const userId = getUserIdFromPayload(payload);
    if (!userId) {
      return NextResponse.json({ error: "user_id not found in webhook payload" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase
      .from("profiles")
      .update({
        // 프로젝트 스키마 표준 컬럼
        plan_tier: "pro",
        // 스키마 확장 대비 (요청사항 호환)
        is_pro: true,
        plan: "pro",
      } as Record<string, unknown>)
      .eq("id", userId);

    if (error) {
      console.error("LemonSqueezy webhook DB update failed:", error);
      return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("LemonSqueezy webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
