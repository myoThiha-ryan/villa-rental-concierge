import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

interface GuestRow {
  id: string;
  whatsapp_name: string | null;
  whatsapp_phone: string;
  language: string;
  created_at: string;
  properties: { name: string } | null;
}

export default async function GuestsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guests")
    .select("id, whatsapp_name, whatsapp_phone, language, created_at, properties(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const guests = (data ?? []) as unknown as GuestRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Guests</h1>
        <p className="text-sm text-muted-foreground">Everyone who has messaged your concierge.</p>
      </div>

      {guests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No guests yet.
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>First seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.whatsapp_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{g.whatsapp_phone}</TableCell>
                  <TableCell>{g.properties?.name ?? "—"}</TableCell>
                  <TableCell className="uppercase">{g.language}</TableCell>
                  <TableCell>{new Date(g.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
