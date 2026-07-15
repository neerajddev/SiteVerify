# Real SMS OTP — do this in the browser (no Terminal)

Why we can’t do this for you from Cursor: the SMS sender must live inside **your** Supabase project and the API key belongs to **your** 2Factor account. We can’t log into those with your passwords. You only need Dashboard clicks — **Terminal is optional**.

---

## A) 2Factor — where is the API key? How to regenerate?

1. Open https://2factor.in and **log in**
2. Look at the top of the dashboard / **Account Summary** — your **API Key** is shown there (you already have one)
3. To regenerate (optional):
   - Check **Settings**, **API Settings**, or **Account** for **Regenerate / Reset API Key**
   - If you don’t see it: email **support@2factor.in** (or WhatsApp support on their site) and ask: “Please reset my API key”
   - If regenerating feels hard, you can **keep using the same key** for now — just don’t paste it into GitHub or chat again

Also recharge a little balance (~₹100–200) so SMS can send.

---

## B) Supabase — store the key (Dashboard, not Terminal)

1. Open your project:  
   https://supabase.com/dashboard/project/eqcejkkqdegxqqcwlmga  
2. Left sidebar → **Project Settings** (gear) → **Edge Functions** → **Secrets**  
   (or: Edge Functions → Secrets)  
3. Add secret:
   - Name: `TWOFACTOR_API_KEY`  
   - Value: paste your 2Factor API key  
4. Save

You will add a second secret later (`SEND_SMS_HOOK_SECRET`) after Step C.

---

## C) Create the `send-sms` function in Supabase Dashboard

1. Left sidebar → **Edge Functions**
2. **Create a new function** / **Deploy a new function**
3. Name it exactly: `send-sms`
4. Turn **OFF** “Verify JWT” / “Enforce JWT” if you see that option (Auth hooks don’t send a user JWT)
5. Paste the code from this file in your project:

   `supabase/functions/send-sms/index.ts`

6. Deploy / Save

Function URL should look like:

```
https://eqcejkkqdegxqqcwlmga.supabase.co/functions/v1/send-sms
```

---

## D) Connect Auth → Send SMS Hook

1. **Authentication** → **Hooks**
2. Enable **Send SMS**
3. Method: **HTTPS endpoint**
4. Paste URL:

```
https://eqcejkkqdegxqqcwlmga.supabase.co/functions/v1/send-sms
```

5. Copy the **Webhook secret** (starts with `v1,whsec_`)
6. Save the hook
7. Go back to **Edge Functions → Secrets** and add:
   - Name: `SEND_SMS_HOOK_SECRET`  
   - Value: the full `v1,whsec_...` secret  

---

## E) Phone login ON

**Authentication → Providers → Phone** → Enable  
(You can ignore Twilio once this hook is on.)

---

## F) Test

Open homeowner or inspector login → enter a real Indian mobile → **Send OTP** → wait for SMS.

If it fails: Edge Functions → `send-sms` → **Logs**, and check 2Factor balance.

---

## What each secret does

| Secret | Where you put it | What it is |
|--------|------------------|------------|
| `TWOFACTOR_API_KEY` | Supabase → Edge Functions → Secrets | Your 2Factor key (sends SMS) |
| `SEND_SMS_HOOK_SECRET` | Same place | Proves the call really comes from Supabase Auth |

Never put these in the React app `.env` for VITE — that would expose them in the browser.
