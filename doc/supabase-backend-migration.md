# Blueprint Migrasi Backend ke Supabase

## Ringkasan Eksekutif
- **Tujuan**: menggantikan layanan AWS/Vercel lama (`/ps/fp`, `/ps/gc`, dsb.) yang digunakan oleh ekstensi Chrome Pro Sender dengan platform Supabase yang terkelola penuh.
- **Ruang lingkup**: desain arsitektur, skema database PostgreSQL, kebijakan Row Level Security (RLS), Edge Functions pengganti endpoint lama, serta strategi migrasi dan observabilitas.
- **Lingkungan target**: satu project Supabase dengan modul Auth, Database, Storage, Functions, dan Platform Settings (logging, realtime).

## Konteks Sistem Eksisting
- Ekstensi (`js/procntt.js`, `js/propup.js`) memanggil endpoint awan untuk:
  - Validasi paket berbayar lewat `AWS_API.PLAN_FETCH`.
  - Mengambil konfigurasi dinamis (`AWS_API.GET_CONFIG_DATA`).
  - Update informasi lokasi dan multi-account (pernah ada di `AWS_API.UPDATE_LOCATION_INFO`).
  - Menarik daftar invoice dan file PDF.
- Data disimpan di Chrome `storage.local`; backend hanya menjadi *source of truth* untuk plan, billing, konfigurasi, dan analitik premium.
- Versi saat ini mem-bypass semua panggilan backend (set nilai premium secara lokal). Migrasi ini menargetkan pemulihan fungsi asli dengan Supabase.

## Arsitektur Target
```
┌─────────────────────────────────────────────────────────────────────┐
│ Pro Sender Chrome Extension                                         │
│ ├─ Konten: js/procntt.js (plan, pricing)                            │
│ ├─ Popup:  js/propup.js (UI premium, invoice)                       │
│ └─ Background: js/probcg.js (lokasi, analytics)                     │
└──────────────┬──────────────────────────────────────────────────────┘
               │ HTTPS (JWT, anon key)
┌──────────────▼──────────────────────────────────────────────────────┐
│ Supabase Project                                                    │
│ ├─ Auth: Email OTP / Magic link / SSO                               │
│ ├─ Database (Postgres + RLS)                                        │
│ │   ├─ users, phone_numbers, subscriptions, invoices, config_items  │
│ │   └─ Feature flags & usage metrics                                │
│ ├─ Storage bucket `invoices` (PDF)                                  │
│ ├─ Edge Functions (Deno)                                            │
│ │   ├─ /ps/fp → `plan-fetch`                                        │
│ │   ├─ /ps/gc → `config-fetch`                                      │
│ │   ├─ /ps/ul → `location-update`                                   │
│ │   ├─ /ps/invoices → `invoice-list`                                │
│ │   └─ /ps/ga → proxy analytics (opsional)                          │
│ └─ Observabilitas: Logs, Tracing, Metrics                           │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│ Integrasi Pihak Ketiga                                              │
│ ├─ Stripe / Midtrans (webhook → Supabase Edge Function)             │
│ ├─ SheetDB replace → Supabase storage + table `design_feedback`     │
│ └─ Newsletter / Support tooling                                     │
└─────────────────────────────────────────────────────────────────────┘

## Modul Platform
| Modul | Peran | Keputusan Desain |
|-------|-------|------------------|
| Supabase Auth | Autentikasi user internal (admin, support) & eksternal (pelanggan). | Extension menggunakan `service_role` di serverless environment untuk endpoint publik dengan validasi token khusus (phone). Portal admin memakai session normal. |
| Postgres + RLS | Source of truth untuk pelanggan, plan, billing, konfigurasi. | Semua tabel customer-facing wajib RLS. Policy utamakan `phone_hash` dan `user_id`. |
| Storage | Simpan berkas invoice PDF & materi onboarding. | Bucket `invoices` dengan RLS hanya pemilik plan yang dapat mengunduh. |
| Edge Functions | API kompatibel dengan endpoint lama. | Satu function per path untuk menjaga maintainability. |

## Desain Skema Data
### Diagram Tingkat Tinggi
```
users (Supabase auth)
  │1
  │
  ├── profiles (1-1)------------------------------┐
  │                                              │
  ├── phone_numbers (1-N)──┬── subscriptions (1-1)│
  │                        │                     │
  │                        └── subscription_events│
  │
  ├── invoices (1-N)───┬── invoice_files
  │                    └── payment_providers
  │
  ├── config_items (global)
  ├── feature_usage (1-N per phone)
  └── support_requests / design_feedback
```

### Tabel Inti & DDL
> Gunakan `UUID` sebagai primary key. Hash nomor WhatsApp sebelum simpan untuk kepatuhan privasi (`pgcrypto` → `digest`).

```sql
-- Aktifkan ekstensi yang diperlukan
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Profil Supabase
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text check (role in ('customer','admin','support')),
  created_at timestamptz default now()
);

-- Daftar nomor WA yang terhubung
create table public.phone_numbers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles (id) on delete cascade,
  phone_e164 text not null,
  phone_hash text generated always as (encode(digest(phone_e164, 'sha256'),'hex')) stored,
  is_primary boolean default false,
  verified_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  unique (profile_id, phone_hash)
);

-- Master plan
create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,          -- e.g. 'basic', 'advance'
  display_name text not null,
  billing_cycle text check (billing_cycle in ('monthly','annually','biannually')),
  price_cents integer not null,
  currency text not null,
  feature_flags jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Status langganan per nomor
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  phone_id uuid references public.phone_numbers (id) on delete cascade,
  plan_id uuid references public.plans (id),
  status text check (status in ('trial','active','cancelled','expired','grace')),
  started_at timestamptz not null,
  current_period_end timestamptz not null,
  last_plan_code text,
  trial_days integer,
  customer_name text,
  customer_email text,
  customer_care_number text,
  auto_renew boolean default true,
  source text,               -- stripe, midtrans, manual
  metadata jsonb default '{}',
  unique (phone_id),
  created_at timestamptz default now()
);

-- Riwayat update status plan untuk audit
create table public.subscription_events (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  event_type text,
  event_payload jsonb,
  created_at timestamptz default now()
);

-- Data konfigurasi dinamis (pengganti GET_CONFIG_DATA)
create table public.config_items (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,            -- e.g. 'TRIAL_FEATURES'
  data jsonb not null,
  description text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz default now()
);

-- Pricing untuk negara spesifik
create table public.country_pricing (
  id uuid primary key default uuid_generate_v4(),
  iso2 text not null,
  dial_code text,
  currency text not null,
  pricing jsonb not null,
  last_synced timestamptz default now(),
  unique (iso2)
);

-- Multi account membership
create table public.account_memberships (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  phone_id uuid references public.phone_numbers (id),
  role text check (role in ('owner','member')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(subscription_id, phone_id)
);

-- Invoice metadata
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid references public.subscriptions (id),
  invoice_number text not null,
  invoice_date date not null,
  total_amount_cents integer,
  currency text,
  pdf_path text,    -- Storage key (e.g. invoices/{invoice_number}.pdf)
  external_url text, -- fallback public link
  metadata jsonb,
  created_at timestamptz default now(),
  unique(subscription_id, invoice_date)
);

-- Feedback pengganti SheetDB
create table public.design_feedback (
  id uuid primary key default uuid_generate_v4(),
  phone_id uuid references public.phone_numbers (id),
  answer text not null,
  created_at timestamptz default now()
);

-- Audit premium usage agregat (untuk insight)
create table public.feature_usage (
  id uuid primary key default uuid_generate_v4(),
  phone_id uuid references public.phone_numbers (id),
  feature_key text not null,
  last_used_at timestamptz not null default now(),
  weekly_count integer default 0,
  monthly_count integer default 0,
  unique(phone_id, feature_key)
);
```

### Relasi & Integritas
- `profiles` ↔ `phone_numbers`: 1:N (satu user bisa memiliki beberapa nomor).
- `phone_numbers` ↔ `subscriptions`: 1:1 (setiap nomor utama punya satu status plan).
- `subscriptions` ↔ `account_memberships`: multi-account sharing.
- `subscriptions` ↔ `invoices`: 1:N (tiap periode penagihan).
- `config_items` dan `country_pricing` bersifat global (diakses oleh extension tanpa identitas user).

## Kebijakan RLS
> Semua policy ditulis dalam bahasa SQL `USING` & `WITH CHECK`.

### Roles
- `anon`: Akses publik (extension sebelum login). Hanya boleh `select` pada `config_items`, `country_pricing` yang bertanda publik, lewat Edge Function (bukan direct).
- `authenticated`: User terdaftar (portal / API). Dapat mengakses datanya sendiri.
- `service_role`: Digunakan di Edge Function untuk menjalankan query server-side dengan kontrol logika khusus.

### Policy Contoh

```sql
-- profiles: user hanya dapat melihat / update dirinya
alter table public.profiles enable row level security;
create policy "Profiles are self-access" on public.profiles
  for select using (auth.uid() = id);
create policy "Update self profile" on public.profiles
  for update using (auth.uid() = id);

-- phone_numbers: akses berdasar kepemilikan
alter table public.phone_numbers enable row level security;
create policy "Owner can read numbers" on public.phone_numbers
  for select using (auth.uid() = profile_id);
create policy "Owner can manage numbers" on public.phone_numbers
  for insert with check (auth.uid() = profile_id)
  using (auth.uid() = profile_id);

-- subscriptions: owner & member
alter table public.subscriptions enable row level security;
create policy "Owner subscription access" on public.subscriptions
  for select using (
    exists (
      select 1 from public.phone_numbers pn
      where pn.id = subscriptions.phone_id
        and pn.profile_id = auth.uid()
    )
  );

create policy "Owner update subscription metadata" on public.subscriptions
  for update using (
    exists (
      select 1 from public.phone_numbers pn
      where pn.id = subscriptions.phone_id
        and pn.profile_id = auth.uid()
    )
  );

-- invoices: pemilik & member plan
alter table public.invoices enable row level security;
create policy "View own invoices" on public.invoices
  for select using (
    exists (
      select 1 from public.subscriptions s
      join public.phone_numbers pn on pn.id = s.phone_id
      left join public.account_memberships am on am.subscription_id = s.id
      where s.id = invoices.subscription_id
        and (
          pn.profile_id = auth.uid()
          or (am.phone_id = pn.id and am.role in ('owner','member'))
        )
    )
  );

-- config_items: public flag
alter table public.config_items enable row level security;
create policy "Public config read" on public.config_items
  for select using ( (data->>'visibility') is null or (data->>'visibility') = 'public' );

-- design_feedback: user hanya boleh insert atas nomor milik sendiri
alter table public.design_feedback enable row level security;
create policy "Submit feedback for own number" on public.design_feedback
  for insert with check (
    exists (
      select 1 from public.phone_numbers pn
      where pn.id = design_feedback.phone_id
        and pn.profile_id = auth.uid()
    )
  );
```

### Bucket Storage RLS
- Buat bucket `invoices` (private).
- Policy: hanya pemilik subscription yang memiliki file path `subscription_id/*`.

```sql
insert into storage.buckets (id, name, public) values ('invoices', 'invoices', false);

create policy "Owner access invoices" on storage.objects
  for select using (
    bucket_id = 'invoices' and
    exists (
      select 1 from public.invoices i
      join public.subscriptions s on s.id = i.subscription_id
      join public.phone_numbers pn on pn.id = s.phone_id
      where i.pdf_path = storage.objects.name
        and pn.profile_id = auth.uid()
    )
  );
```

## Edge Functions
> Ditulis dengan Deno di direktori `supabase/functions`.

### 1. `plan-fetch`
- **Tujuan**: pengganti `AWS_API.PLAN_FETCH`.
- **Metode**: `GET /ps/fp?phone=...`.
- **Langkah**:
  1. Validasi signature sederhana (`x-extension-key`) untuk mencegah scraping.
  2. Normalisasi nomor ke format E.164.
  3. Query `phone_numbers` → `subscriptions` → `plans`.
  4. Kembalikan payload JSON:
     ```json
     {
       "plan_type": "Advance",
       "last_plan_type": "Basic",
       "expiry_date": "2024-12-31T23:59:59Z",
       "created_date": "...",
       "subscribed_date": "...",
       "customer_care_number": "918178004424",
       "trial_days": 7,
       "name": "John",
       "email": "john@pros.example"
     }
     ```
  5. Log event audit pada `subscription_events`.

### 2. `config-fetch`
- **Metode**: `GET /ps/gc?operation=get-all-config-data`.
- **Respon**: array `{ name, data }` sesuai ekspektasi `createConfigMap` di `js/procntt.js:2980`.
- **Data sumber**: `config_items`. Tambahkan fallback ke `country_pricing`.
- **Caching**: tambahkan header `Cache-Control: max-age=3600`.

### 3. `location-update`
- **Metode**: `POST /ps/ul`.
- **Input**: JSON `{ phone, location_info, ip_info }`.
- **Tindakan**: simpan ke tabel `location_logs` (opsional) untuk analitik, update metadata di `phone_numbers.metadata`.
- **RLS**: Edge Function menggunakan `service_role`, tetapi validasi token per phone.

```sql
create table public.location_logs (
  id uuid primary key default uuid_generate_v4(),
  phone_id uuid references public.phone_numbers (id),
  location jsonb,
  ip jsonb,
  detected_at timestamptz default now()
);
```

### 4. `invoice-list`
- **Metode**: `GET /ps/invoices?phone=...`.
- **Respon**: array `{ date, invoice_pdf_url }` meniru struktur lama (`js/propup.js:5327`).
- **Logic**:
  - Validasi kepemilikan nomor.
  - Ambil `invoices` terurut desc.
  - Generate signed URL `supabase.storage.from('invoices').createSignedUrl(...)`.

### 5. `design-feedback`
- **Metode**: `POST /ps/design-feedback`.
- **Input**: `{ phone, answer }` (pengganti `https://sheetdb.io/api/v1/...` di `js/propup.js:5320`).
- **Output**: status success.

### 6. Webhook `billing-sync`
- Trigger dari Stripe/Midtrans → update `subscriptions` dan buat `invoices`.
- Perlu secret path `/ps/billing-webhook`.

### Contoh Skeleton Function (`plan-fetch/index.ts`)
```ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

serve(async (req) => {
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  if (!phone) {
    return new Response(JSON.stringify({ error: "phone missing" }), { status: 400 });
  }

  // Basic key validation
  const apiKey = req.headers.get("x-extension-key");
  if (apiKey !== Deno.env.get("EXTENSION_EDGE_KEY")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const phoneNormalized = normalizePhone(phone); // implement util
  const { data: result, error } = await supabase
    .from("phone_numbers")
    .select(`
      id,
      phone_e164,
      subscriptions (
        status,
        current_period_end,
        started_at,
        last_plan_code,
        trial_days,
        customer_name,
        customer_email,
        customer_care_number,
        plans (code)
      )
    `)
    .eq("phone_e164", phoneNormalized)
    .single();

  if (error || !result?.subscriptions) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }

  const sub = result.subscriptions;
  const payload = {
    plan_type: sub.plans?.code ?? "Free",
    last_plan_type: sub.last_plan_code,
    expiry_date: sub.current_period_end,
    created_date: sub.started_at,
    subscribed_date: sub.started_at,
    customer_care_number: sub.customer_care_number ?? "918178004424",
    trial_days: sub.trial_days,
    name: sub.customer_name,
    email: sub.customer_email,
  };

  return new Response(JSON.stringify({ body: payload }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## Strategi Migrasi
1. **Persiapan Supabase Project**
   - Buat project & set timezone.
   - Aktifkan email templates (untuk portal).
   - Simpan `EXTENSION_EDGE_KEY` di Secrets Manager.
2. **Impor Data Master**
   - `plans` (Basic, Advance, Trial) + feature matrix mengikuti `js/prodata.js` (lihat `PREMIUM_FEATURES`, `TRIAL_FEATURES`).
   - `config_items` berisi JSON `HELP_MESSAGES`, `FAQS`, `PRICING_DATA`, `PREMIUM_REMINDER`, dsb (ambil dari `js/prodata.js` lines 10-850).
   - `country_pricing` dari `PRICING_PAGE_LINK`.
3. **Migrasi Pelanggan**
   - Ekspor data lama (AWS DynamoDB/MySQL) ke CSV.
   - Normalisasi nomor ke E.164.
   - Buat skrip impor menggunakan `supabase-js` atau `psql`.
   - Buat mapping plan → `plans.code`.
   - Set `subscriptions.current_period_end` sesuai expiry.
4. **Migrasi Invoice**
   - Upload PDF ke bucket `invoices`.
   - Isi tabel `invoices` dengan path & metadata.
5. **Deploy Edge Functions**
   - `supabase functions deploy plan-fetch`.
   - Tambahkan route custom domain (opsional).
6. **Integrasi Payment Webhook**
   - Config Webhook provider → `https://<project>.functions.supabase.co/ps/billing-webhook`.
   - Simpan secret signature di env.
7. **UAT**
   - Jalankan test manual di extension (menghapus bypass).
   - Verifikasi: plan fetch, config fetch, invoice list, feedback submission.
8. **Cutover**
   - Rilis update extension yang mengarah ke Supabase endpoints.
   - Pantau error log Supabase & Sentry (opsional).

## Integrasi Dengan Ekstensi

### Variabel Lingkungan
| Nama | Digunakan di | Nilai |
|------|--------------|-------|
| `SUPABASE_URL` | Edge Functions & portal admin | URL project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Service key (jangan di-embed di extension). |
| `EXTENSION_EDGE_KEY` | Edge Functions | Secret yang dibundel di extension (misal hashed). |
| `PUBLIC_ANON_KEY` | Portal admin / integration UI | Key bawaan Supabase. |

### Perubahan Kode Extension
- `js/prodata.js`: ganti `AWS_API` constant ke domain Supabase (`https://<project>.functions.supabase.co/ps`).
- Cabut code bypass (misal `fetch_plan_details` di `js/procntt.js:1534`, `fetchConfigData` di `js/procntt.js:2926`).
- Tambahkan header `x-extension-key`.
- Untuk feedback, ganti `fetch("https://sheetdb.io/...")` jadi `fetch("https://<project>.functions.supabase.co/ps/design-feedback")`.
- Gunakan response `config-fetch` untuk mem-`loadConfigData`.

### Contoh Implementasi Fetch Plan
```js
const SUPABASE_FUNCTION_BASE = "https://<project>.functions.supabase.co/ps";
async function fetch_data(number) {
  const url = `${SUPABASE_FUNCTION_BASE}/fp?phone=${encodeURIComponent(number)}`;
  const response = await fetch(url, {
    headers: {
      "x-extension-key": EXTENSION_EDGE_KEY,
    },
  });
  if (!response.ok) throw new Error("Plan fetch failed");
  const { body } = await response.json();
  return body;
}
```

## Keamanan & Kepatuhan
- **Data minimization**: simpan nomor WA dalam bentuk hash (`phone_hash`) untuk query; nomor asli dienkripsi di `phone_e164` menggunakan `pgcrypto` atau disimpan plaintext jika bisnis memerlukan.
- **Auditing**: `subscription_events` menyimpan jejak (plan upgrade, payment success, cancellation).
- **Secrets management**: gunakan `supabase secrets set` untuk variabel Edge Function; jangan commit ke repo.
- **Rate limiting**: gunakan middleware Edge Function (misal `upstash/redis`) untuk mencegah abuse.
- **GDPR/PDPA**: sediakan endpoint hapus data; `cascade delete` sudah diaktifkan.
- **Transport**: wajib HTTPS; extension memverifikasi sertifikat.

## Observabilitas
- Aktifkan **Logs Explorer** Supabase; buat filter khusus `edge_function_name`.
- Kirim event penting ke **Google Analytics** via Edge Function (opsional) agar satu sumber.
- Simpan metrik custom ke tabel `function_metrics` untuk debugging (latency, error count).
- Gunakan `Sentry` atau `Logflare` adaptor di Edge Functions untuk error tracking lanjutan.

## Testing & QA
1. **Unit Test** Edge Functions (menggunakan `deno test`) dengan mock Supabase client.
2. **Integration Test**: script Node yang memanggil endpoint supabase (phone dummy).
3. **Data Validation**: jalankan query verifikasi (contoh, semua subscription punya plan valid).
4. **Regression**: restore state extension & jalankan skenario:
   - Pengguna trial → plan fetch kembalikan `trial`.
   - Pelanggan premium dengan multi-account → invoice list benar.
   - Config fetch memuat `TRIAL_FEATURES`, `PREMIUM_FEATURES`, dsb.

## Roadmap & Pengembangan Lanjutan
- Fase 2: tambahkan modul **Realtime** untuk broadcast perubahan config tanpa update extension.
- Fase 3: portal admin (Next.js) terintegrasi `supabase-auth` untuk mengelola plan, invoice, config.
- Fase 4: implementasi **Usage-based billing** (metered features) menggunakan `feature_usage`.
- Fase 5: centralisasi analytics (menggantikan GA di klien) dengan Edge Function aggregator.

## Checklist Implementasi
- [ ] Supabase project & secrets selesai.
- [ ] Tabel & RLS dieksekusi.
- [ ] Data master (plans, config) terisi.
- [ ] Edge Functions terdeploy & dites.
- [ ] Storage invoices termigrasi.
- [ ] Webhook pembayaran aktif.
- [ ] Ekstensi diperbarui & bypass dicabut.
- [ ] Observability dashboard siap.

---
Dokumen ini berfungsi sebagai panduan end-to-end untuk tim engineering dan ops dalam memindahkan backend Pro Sender ke Supabase secara aman dan terukur. Pastikan setiap perubahan kode direview dan diuji sebelum dirilis ke pengguna akhir.
