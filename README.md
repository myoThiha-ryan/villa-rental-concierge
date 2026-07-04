# Villa Rental Concierge

An AI-powered WhatsApp guest concierge for villas, apartments, and short-term rentals. Guests message on WhatsApp and receive warm, accurate, **property-specific** local recommendations (restaurants, beaches, landmarks, supermarkets, transport, etc.). Property owners and managers curate the knowledge base, review conversations, and handle escalations through an admin dashboard.

The bot answers from a **curated host knowledge base only** — it never invents opening hours, prices, phone numbers, or distances, and it escalates anything unsafe, medical, emergency-related, or angry to a human.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript, single deploy) |
| Database | Supabase PostgreSQL + `pgvector` |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (uploaded documents) |
| AI | OpenAI `gpt-4o-mini` (chat + intent) + `text-embedding-3-small` (embeddings) |
| Messaging | WhatsApp Business Cloud API (Graph API v21.0) |
| UI | shadcn/ui (base-ui primitives), Tailwind CSS 4, lucide-react, sonner |
| Tests | Vitest |

---

## Architecture

```
WhatsApp Guest → WhatsApp Cloud API → POST /api/webhooks/whatsapp
                                            │  (verify HMAC signature, return 200 fast)
                                            ▼  Next.js after() — fire-and-forget
                                   AI Pipeline (src/lib/ai/pipeline.ts)
                                   1. Resolve property + upsert guest
                                   2. Load conversation history
                                   3. Classify intent (gpt-4o-mini, JSON)
                                   4. Check escalation triggers
                                   5. Vector search: recommendations + KB (pgvector)
                                   6. Rerank (similarity + host priority + family fit)
                                   7. Build prompt with retrieved context
                                   8. Generate WhatsApp-concise reply
                                   9. Persist messages + log analytics event
                                  10. Send reply via WhatsApp API
                                            │
              Supabase (Postgres + pgvector + Auth + Storage, RLS on every table)
                                            │
                       Admin Dashboard (Next.js SSR, /dashboard/*)
```

See [AGENTS.md](AGENTS.md) for AI behavior rules and [the implementation plan](.) for the full design rationale.

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key
- A [Meta / WhatsApp Business](https://developers.facebook.com) app with the Cloud API enabled (for live messaging)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**server-only**, used by the webhook to bypass RLS) |
| `OPENAI_API_KEY` | OpenAI dashboard |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → WhatsApp → API Setup |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta → WhatsApp → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta → permanent system-user token |
| `WHATSAPP_VERIFY_TOKEN` | A random string you choose; entered again in the Meta webhook config |
| `WHATSAPP_APP_SECRET` | Meta → App Settings → Basic (used to verify the HMAC signature) |
| `GOOGLE_PLACES_API_KEY` | Optional — live place enrichment |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app (e.g. your Vercel domain) |

### 3. Run the database migrations

Apply the SQL files in `supabase/migrations/` **in order** (00001 → 00007). Either:

- **Supabase CLI:** `supabase db push`, or
- **SQL Editor:** paste each file's contents and run them in numerical order.

This creates the 13 tables, enables `pgvector`/`uuid-ossp`/`pg_trgm`, sets up IVFFlat vector indexes, RLS policies, the `handle_new_user` signup trigger, the seed recommendation categories, and the `match_recommendations` / `match_knowledge_base` RPC functions.

### 4. Create the storage bucket

In Supabase → Storage, create a **private** bucket named `documents` (used for uploaded PDFs/TXT/CSV files).

### 5. Configure Google OAuth (optional)

In Supabase → Authentication → Providers, enable Google and set the redirect URL to `<NEXT_PUBLIC_APP_URL>/auth/callback`.

### 6. Run it

```bash
npm run dev
```

Open http://localhost:3000, register an account, and add your first property.

### 7. (Optional) Seed sample data

After creating a property, seed it with sample recommendations to try the chatbot immediately:

```bash
npx tsx scripts/seed.ts <property_id>
```

---

## WhatsApp Webhook Configuration

1. Deploy the app (or expose `localhost` with a tunnel like `ngrok`).
2. In the Meta App dashboard → WhatsApp → Configuration → Webhook:
   - **Callback URL:** `<NEXT_PUBLIC_APP_URL>/api/webhooks/whatsapp`
   - **Verify token:** the same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to the **`messages`** field.
3. Set the property's WhatsApp phone number ID in **Dashboard → Settings** so inbound messages resolve to the right property.

The webhook verifies Meta's `GET` challenge and validates the `X-Hub-Signature-256` HMAC on every `POST` before processing.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |

---

## Testing

Unit tests cover the AI logic that must behave deterministically:

- **Escalation detection** — emergencies, explicit human requests, complaints, low-confidence, and priority ordering (`tests/unit/ai/escalation.test.ts`)
- **Retrieval reranking** — host priority boost, family-friendly penalty, similarity ordering (`tests/unit/ai/retriever.test.ts`)
- **Document chunking** — boundaries, indexing, empty input (`tests/unit/documents/chunker.test.ts`)

```bash
npm test
```

**Manual end-to-end checklist:**

1. Register/login — protected `/dashboard` routes redirect when logged out.
2. Create a property with GPS coordinates; edit it.
3. Add a recommendation; confirm an embedding row is generated (check the DB).
4. Upload a PDF; confirm chunks land in `property_knowledge_base` with embeddings.
5. Use **Dashboard → Conversations → Test Chat** to query the pipeline without WhatsApp.
6. Send a real WhatsApp message and receive an AI reply.
7. Send "I need to speak to the manager" → an escalation ticket appears.
8. Confirm analytics events log and stats render on the overview.

---

## Deployment (Vercel + Supabase)

1. Push the repo to GitHub.
2. Import it into **Vercel**; framework preset is auto-detected (Next.js).
3. Add all environment variables from `.env.example` to the Vercel project (Production + Preview).
4. Set `NEXT_PUBLIC_APP_URL` to the production domain.
5. Use your **production** Supabase project; run the migrations there and create the `documents` bucket.
6. Deploy, then point the WhatsApp webhook at the production `/api/webhooks/whatsapp` URL.
7. Add the production domain to Supabase → Authentication → URL Configuration (redirect URLs).

The webhook route is excluded from auth middleware and uses the service-role client, so it works without a signed-in session while still verifying Meta's signature.

---

## Security Checklist

- ✅ **No scraping.** Only official WhatsApp Cloud API and approved PMS/channel-manager integrations are used.
- ✅ **Row Level Security** on every table; owners/managers can only access their own property's data via the `owns_property()` helper.
- ✅ **Service-role key is server-only** — never exposed to the browser; used solely by the webhook handler.
- ✅ **Webhook signature verification** — HMAC-SHA256 with `timingSafeEqual`; unsigned/invalid requests are rejected.
- ✅ **Input validation** — Zod schemas on all write endpoints.
- ✅ **Guest PII protection** — phone numbers stored per-property, gated by RLS; no cross-property leakage.
- ✅ **Human review** — managers can read every conversation and escalations route to humans for unsafe/medical/emergency/angry messages.
- ✅ **No hallucination** — the model is instructed to answer only from retrieved host content and to say it doesn't know otherwise.
- ✅ **Upload limits** — 10 MB max, allow-list of PDF/TXT/CSV types.

---

## Project Structure

```
villa-rental-concierge/
├── supabase/migrations/      # 7 ordered SQL migrations (13 tables, RLS, RPCs)
├── scripts/seed.ts           # sample recommendation seeding
├── src/
│   ├── app/
│   │   ├── (auth)/           # login, register, OAuth callback
│   │   ├── dashboard/        # admin pages
│   │   └── api/              # REST + WhatsApp webhook
│   ├── lib/
│   │   ├── supabase/         # browser, server, admin, middleware clients
│   │   ├── openai/           # client, embeddings, chat
│   │   ├── whatsapp/         # client, webhook verification, handler
│   │   ├── ai/               # pipeline, intent, retriever, escalation, prompts
│   │   ├── documents/        # pdf-parser, chunker, ingestion
│   │   └── utils/            # errors, validators
│   ├── components/           # shadcn/ui + feature components
│   └── types/                # database types
└── tests/unit/               # Vitest unit tests
```

---

## AI Behavior

The concierge is friendly, warm, professional, and WhatsApp-concise. It:

- Uses the host's curated knowledge base first and ranks 3–5 recommendations with distance, travel time, and map links when available.
- **Never** invents opening hours, prices, phone numbers, or distances.
- Escalates anything unsafe, illegal, medical, emergency-related, or angry to a human, with a safe holding response.
- Stays focused on villa guest support and local recommendations.
- Is designed for multi-property expansion from day one.
