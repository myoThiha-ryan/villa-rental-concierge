/**
 * The House Manual: the operational questions guests ask hosts over and over.
 * Each section a host fills in becomes an embedded knowledge-base entry the AI
 * answers from, so these repetitive questions get handled automatically.
 *
 * Section keys are stable identifiers stored in KB row metadata
 * (`metadata.manual_section`) so edits update the same entry idempotently.
 */
export interface HouseManualSection {
  key: string;
  label: string;
  placeholder: string;
}

export const HOUSE_MANUAL_SECTIONS: HouseManualSection[] = [
  {
    key: "check_in",
    label: "Check-in instructions",
    placeholder:
      "How do guests get in? e.g. Check-in from 3pm. Lockbox by the front door, code 4821. Take the lift to the 2nd floor, apartment B.",
  },
  {
    key: "wifi",
    label: "WiFi",
    placeholder:
      "Network name and password. e.g. Network: VillaSerena_5G — Password: sunset2024",
  },
  {
    key: "parking",
    label: "Parking",
    placeholder:
      "Where to park, permits, cost. e.g. Free street parking on Elm Rd, or paid garage 2 min away (€15/day).",
  },
  {
    key: "house_rules",
    label: "House rules",
    placeholder:
      "Quiet hours, smoking, pets, max guests. e.g. No smoking indoors. Quiet after 10pm. No parties. Max 6 guests.",
  },
  {
    key: "appliances",
    label: "Appliances & how-tos",
    placeholder:
      "AC/heating, washer, TV, coffee machine. e.g. AC remote is in the living room drawer — press MODE for cool. Washer pods under the sink.",
  },
  {
    key: "checkout",
    label: "Checkout",
    placeholder:
      "Checkout time and steps. e.g. Checkout by 11am. Load the dishwasher, take out the trash, leave keys in the lockbox.",
  },
  {
    key: "trash_recycling",
    label: "Trash & recycling",
    placeholder:
      "Where bins are and collection days. e.g. Bins are in the side alley. General waste on Tue, recycling on Fri mornings.",
  },
  {
    key: "amenities",
    label: "Amenities & essentials",
    placeholder:
      "Where to find everyday items. e.g. Extra towels & blankets in the hallway closet. First-aid kit under the bathroom sink. Hair dryer in the bedroom.",
  },
  {
    key: "emergency",
    label: "Emergency & contacts",
    placeholder:
      "Host contact and local emergency info. e.g. Host: +34 600 123 456. Local emergency: 112. Nearest hospital: Clínica del Mar, 8 min by car.",
  },
];

export const HOUSE_MANUAL_KEYS = HOUSE_MANUAL_SECTIONS.map((s) => s.key);

export const HOUSE_MANUAL_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  HOUSE_MANUAL_SECTIONS.map((s) => [s.key, s.label])
);
