-- Co-pilot (human-in-the-loop) mode.
-- Hosts can choose whether the assistant sends replies automatically or drafts
-- them for approval first.

-- Per-property reply mode: 'auto' sends immediately, 'draft' holds for approval.
alter table public.properties
  add column if not exists reply_mode text not null default 'auto'
  check (reply_mode in ('auto', 'draft'));

-- Assistant messages can be pending approval ('draft'), delivered ('sent'),
-- or dismissed by the host ('discarded'). Existing rows default to 'sent'.
alter table public.messages
  add column if not exists status text not null default 'sent'
  check (status in ('draft', 'sent', 'discarded'));

-- Fast lookup of pending drafts for the review queue.
create index if not exists idx_messages_draft
  on public.messages(conversation_id)
  where status = 'draft';
