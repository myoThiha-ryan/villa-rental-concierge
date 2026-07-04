import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyWebhookSignature,
  verifyWebhookSubscription,
} from "@/lib/whatsapp/webhook";
import { handleInboundMessage } from "@/lib/whatsapp/handler";
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/types";

// GET: Meta webhook verification handshake.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (verifyWebhookSubscription(mode, token) && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST: incoming messages and status updates.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Collect text messages, then process them after responding 200 to Meta.
  const tasks: Array<() => Promise<void>> = [];
  const supabase = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const messages = value?.messages ?? [];
      const contactName = value?.contacts?.[0]?.profile?.name ?? null;

      for (const message of messages) {
        if (message.type !== "text" || !message.text?.body || !phoneNumberId) continue;

        tasks.push(() =>
          handleInboundMessage({
            supabase,
            phoneNumberId,
            from: message.from,
            guestName: contactName,
            text: message.text!.body,
            whatsappMessageId: message.id,
          })
        );
      }
    }
  }

  // Process asynchronously so WhatsApp gets a fast 200 (it retries non-200s).
  after(async () => {
    for (const task of tasks) {
      try {
        await task();
      } catch (err) {
        console.error("Webhook task failed", err);
      }
    }
  });

  return NextResponse.json({ received: true });
}
