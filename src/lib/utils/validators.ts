import { z } from "zod";

export const propertySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  country: z.string().max(200).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  timezone: z.string().max(100).default("UTC"),
  check_in_time: z.string().max(20).optional().nullable(),
  check_out_time: z.string().max(20).optional().nullable(),
  max_guests: z.number().int().positive().optional().nullable(),
  whatsapp_phone_number_id: z.string().max(200).optional().nullable(),
  whatsapp_business_account_id: z.string().max(200).optional().nullable(),
  welcome_message: z.string().max(2000).optional().nullable(),
  ai_personality: z.string().max(2000).optional().nullable(),
  active: z.boolean().default(true),
});

export const recommendationSchema = z.object({
  property_id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  host_note: z.string().max(1000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  distance_from_property: z.number().nonnegative().optional().nullable(),
  estimated_travel_time: z.string().max(100).optional().nullable(),
  price_level: z.number().int().min(1).max(4).optional().nullable(),
  opening_hours: z.string().max(500).optional().nullable(),
  booking_required: z.boolean().default(false),
  family_friendly: z.boolean().default(true),
  accessibility_notes: z.string().max(1000).optional().nullable(),
  map_url: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  website_url: z.string().url().max(1000).optional().nullable().or(z.literal("")),
  phone_number: z.string().max(50).optional().nullable(),
  tags: z.array(z.string().max(50)).default([]),
  priority_score: z.number().int().min(1).max(10).default(5),
  active: z.boolean().default(true),
});

export const knowledgeBaseEntrySchema = z.object({
  property_id: z.string().uuid(),
  source_type: z.enum(["welcome_book", "house_rules", "faq", "manual_entry", "pdf"]),
  title: z.string().max(300).optional().nullable(),
  content: z.string().min(1).max(20000),
  active: z.boolean().default(true),
});

export const houseManualSchema = z.object({
  property_id: z.string().uuid(),
  sections: z.record(z.string(), z.string().max(5000)),
});

export const chatQuerySchema = z.object({
  property_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
});
