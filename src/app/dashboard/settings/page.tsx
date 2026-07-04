import { createClient } from "@/lib/supabase/server";
import { PropertySelect } from "@/components/properties/property-select";
import { TestChat } from "@/components/conversations/test-chat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@/types/database";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string }>;
}) {
  const { property_id } = await searchParams;
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  const activeProperty =
    (properties?.find((p) => p.id === property_id) ?? properties?.[0]) as Property | undefined;

  const webhookUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com") + "/api/webhooks/whatsapp";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          WhatsApp integration and bot testing.
        </p>
      </div>

      {!properties || properties.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Add a property first.
        </div>
      ) : (
        <>
          <PropertySelect properties={properties as Property[]} selectedId={activeProperty?.id} />

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp webhook</CardTitle>
              <CardDescription>
                Configure this URL and verify token in the Meta Developer Console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Callback URL</p>
                <code className="block rounded bg-muted px-2 py-1 text-xs">{webhookUrl}</code>
              </div>
              <div>
                <p className="font-medium">Verify token</p>
                <p className="text-muted-foreground">
                  Set in <code>WHATSAPP_VERIFY_TOKEN</code> environment variable.
                </p>
              </div>
              <div>
                <p className="font-medium">Phone number ID for this property</p>
                {activeProperty?.whatsapp_phone_number_id ? (
                  <code className="block rounded bg-muted px-2 py-1 text-xs">
                    {activeProperty.whatsapp_phone_number_id}
                  </code>
                ) : (
                  <Badge variant="secondary">Not configured — set it in the property settings</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {activeProperty && <TestChat propertyId={activeProperty.id} />}
        </>
      )}
    </div>
  );
}
