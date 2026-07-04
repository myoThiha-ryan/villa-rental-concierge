const GRAPH_API_VERSION = "v21.0";

interface SendTextOptions {
  phoneNumberId: string;
  to: string;
  body: string;
  accessToken?: string;
}

export async function sendWhatsAppText({
  phoneNumberId,
  to,
  body,
  accessToken,
}: SendTextOptions): Promise<void> {
  const token = accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("Missing WhatsApp access token");

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body, preview_url: true },
      }),
    }
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`WhatsApp send failed (${res.status}): ${errorBody}`);
  }
}
