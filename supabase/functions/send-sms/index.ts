import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const TWOFACTOR_API_KEY = Deno.env.get("TWOFACTOR_API_KEY") ?? "";
/** Must match Approved template name in 2Factor (SMS OTP → OTP Templates) */
const TWOFACTOR_TEMPLATE =
  (Deno.env.get("TWOFACTOR_TEMPLATE") || "").trim() || "SiteVerify_Auth_OTP";
const HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";

function to2FactorPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

async function sendVia2Factor(phone, otp) {
  const mobile = to2FactorPhone(phone);
  // Template is required for India SMS OTP — without it 2Factor often falls back to Voice
  const path = `${TWOFACTOR_API_KEY}/SMS/${mobile}/${otp}/${encodeURIComponent(TWOFACTOR_TEMPLATE)}`;
  const url = `https://2factor.in/API/V1/${path}`;
  console.log("[send-sms] Sending SMS OTP via template", TWOFACTOR_TEMPLATE, "to", mobile);
  const res = await fetch(url);
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = {};
  }
  return {
    ok: res.ok && data.Status === "Success",
    status: res.status,
    data,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!TWOFACTOR_API_KEY || !HOOK_SECRET) {
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: "Missing TWOFACTOR_API_KEY or SEND_SMS_HOOK_SECRET",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const secret = HOOK_SECRET.replace("v1,whsec_", "");

  try {
    const wh = new Webhook(secret);
    const verified = wh.verify(payload, headers);
    const phone = verified.user && verified.user.phone;
    const otp = verified.sms && verified.sms.otp;

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({
          error: {
            http_code: 400,
            message: "Missing phone or OTP in hook payload",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await sendVia2Factor(phone, otp);
    if (!result.ok) {
      console.error("[send-sms] 2Factor failed", result);
      return new Response(
        JSON.stringify({
          error: {
            http_code: 500,
            message: "2Factor error: " + JSON.stringify(result.data),
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-sms] Hook error", err);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: err instanceof Error ? err.message : String(err),
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
