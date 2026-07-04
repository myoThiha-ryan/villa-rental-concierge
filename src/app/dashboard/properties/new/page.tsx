import { PropertyForm } from "@/components/properties/property-form";

export default function NewPropertyPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add property</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new villa or rental for your concierge bot.
        </p>
      </div>
      <PropertyForm />
    </div>
  );
}
