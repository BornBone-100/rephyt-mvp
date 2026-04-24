import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export const subscribeUser = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
    return null;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
  });

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return subscription;

  const { error } = await (supabase as any).from("user_push_tokens").upsert({
    user_id: user.id,
    subscription_json: JSON.stringify(subscription),
  });

  if (error) {
    console.error("Failed to upsert user push token:", error);
  }

  return subscription;
};
