"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Property } from "@/types/database";

export function PropertySelect({
  properties,
  selectedId,
}: {
  properties: Property[];
  selectedId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("property_id", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={selectedId} onValueChange={handleChange}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a property" />
      </SelectTrigger>
      <SelectContent>
        {properties.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
