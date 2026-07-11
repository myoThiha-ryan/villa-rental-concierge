export type UserRole = "owner" | "manager" | "staff";
export type BookingStatus = "confirmed" | "checked_in" | "checked_out" | "cancelled";
export type SourceType = "welcome_book" | "house_rules" | "faq" | "manual_entry" | "pdf";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
export type ConversationStatus = "active" | "escalated" | "resolved" | "closed";
export type MessageRole = "guest" | "assistant" | "host";
export type EscalationStatus = "open" | "in_progress" | "resolved" | "dismissed";

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  check_in_time: string | null;
  check_out_time: string | null;
  max_guests: number | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_business_account_id: string | null;
  welcome_message: string | null;
  ai_personality: string | null;
  reply_mode: "auto" | "draft";
  ical_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  property_id: string;
  whatsapp_phone: string;
  whatsapp_name: string | null;
  full_name: string | null;
  email: string | null;
  language: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  property_id: string;
  guest_id: string | null;
  check_in: string;
  check_out: string;
  num_guests: number | null;
  status: BookingStatus;
  source: string | null;
  external_id: string | null;
  external_uid: string | null;
  guest_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  property_id: string;
  booking_id: string | null;
  guest_id: string | null;
  template_key: string;
  body: string;
  send_at: string;
  status: "pending" | "sent" | "skipped" | "cancelled";
  sent_at: string | null;
  created_at: string;
}

export interface RecommendationCategory {
  id: string;
  name: string;
  icon: string | null;
  display_order: number;
  created_at: string;
}

export interface Recommendation {
  id: string;
  property_id: string;
  category_id: string;
  name: string;
  description: string;
  host_note: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_from_property: number | null;
  estimated_travel_time: string | null;
  price_level: number | null;
  opening_hours: string | null;
  booking_required: boolean;
  family_friendly: boolean;
  accessibility_notes: string | null;
  map_url: string | null;
  website_url: string | null;
  phone_number: string | null;
  tags: string[];
  priority_score: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyKnowledgeBase {
  id: string;
  property_id: string;
  source_type: SourceType;
  source_document_id: string | null;
  title: string | null;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadedDocument {
  id: string;
  property_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  processing_status: ProcessingStatus;
  chunk_count: number;
  error_message: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  property_id: string;
  guest_id: string;
  status: ConversationStatus;
  started_at: string;
  last_message_at: string;
  message_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  whatsapp_message_id: string | null;
  intent: string | null;
  confidence: number | null;
  retrieved_context: Record<string, unknown> | null;
  tokens_used: Record<string, unknown> | null;
  status: "draft" | "sent" | "discarded";
  created_at: string;
}

export interface EscalationTicket {
  id: string;
  conversation_id: string;
  property_id: string;
  reason: string;
  trigger_message_id: string | null;
  status: EscalationStatus;
  assigned_to: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AnalyticsEvent {
  id: string;
  property_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  conversation_id: string | null;
  created_at: string;
}

export interface IntegrationSettings {
  id: string;
  property_id: string;
  provider: string;
  config: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}
