/**
 * Twilio REST API로 SMS 발송.
 * 환경변수: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID 또는 TWILIO_FROM_NUMBER
 */
export async function sendSmsViaTwilio(toE164: string, body: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token) {
    return { ok: false, message: "Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)." };
  }

  const params = new URLSearchParams();
  params.set("To", toE164);
  params.set("Body", body);
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    params.set("From", fromNumber);
  } else {
    return { ok: false, message: "Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER." };
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, message: text.slice(0, 200) || `Twilio HTTP ${res.status}` };
  }
  return { ok: true };
}
