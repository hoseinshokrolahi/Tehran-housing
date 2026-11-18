-- اسکیمای پایگاه داده Supabase (PostgreSQL)
-- سامانه تحلیل بازار مسکن تهران - مرحله ۲
-- تاریخ: ۱۶ نوامبر ۲۰۲۶

create extension if not exists "pgcrypto";

-- ۱. مناطق ۲۲گانه تهران
create table if not exists public.regions (
  id smallint primary key check (id between 1 and 22),
  name_fa text not null unique,
  is_wave_origin_monitored boolean not null default false, -- مناطق ۱، ۲، ۳، ۵، ۶، ۸، ۱۴
  is_wave_target_monitored boolean not null default false, -- منطقه ۴
  created_at timestamptz not null default now()
);

-- ۲. محله‌ها و ریزناحیه‌ها
create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  region_id smallint not null references public.regions(id) on delete cascade,
  name_fa text not null,
  slug text not null unique,
  is_priority_target boolean not null default false, -- مانند حکیمیه
  created_at timestamptz not null default now(),
  unique (region_id, name_fa)
);

-- ۳. منابع داده و وضعیت مجوز
create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null check (category in ('listing', 'transaction', 'fx')),
  geo_granularity text not null check (geo_granularity in ('city', 'region', 'neighborhood')),
  license_status text not null check (license_status in ('official_public', 'api_licensed', 'manual_csv', 'pending_approval')),
  source_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ۴. آگهی‌های پیشنهادی (تفکیک کامل از معاملات)
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id),
  external_id text,
  region_id smallint not null references public.regions(id),
  neighborhood_id uuid references public.neighborhoods(id),
  area_sqm numeric(10, 2) not null check (area_sqm > 0),
  total_price_toman bigint not null check (total_price_toman > 0),
  price_per_sqm_toman bigint generated always as (round(total_price_toman / area_sqm)) stored,
  published_at timestamptz not null,
  source_url text,
  is_duplicate boolean not null default false,
  is_outlier boolean not null default false,
  created_at timestamptz not null default now(),
  unique (source_id, external_id)
);

create index if not exists idx_listings_region_date on public.listings (region_id, published_at desc);
create index if not exists idx_listings_neighborhood_date on public.listings (neighborhood_id, published_at desc);

-- ۵. معاملات تأییدشده (فقط با تأیید منبع رسمی)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id),
  external_ref text,
  region_id smallint not null references public.regions(id),
  neighborhood_id uuid references public.neighborhoods(id), -- فقط در صورت وجود داده محله‌ای واقعی
  area_sqm numeric(10, 2) check (area_sqm > 0),
  total_price_toman bigint check (total_price_toman > 0),
  price_per_sqm_toman bigint check (price_per_sqm_toman > 0),
  transacted_at date not null,
  is_verified boolean not null default true,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default now(),
  unique (source_id, external_ref)
);

create index if not exists idx_transactions_region_date on public.transactions (region_id, transacted_at desc);

-- ۶. تاریخچه روزانه نرخ دلار
create table if not exists public.usd_rates (
  rate_date date not null,
  rate_type text not null check (rate_type in ('free_market', 'nima', 'official')),
  source_id uuid not null references public.data_sources(id),
  rate_toman numeric(14, 2) not null check (rate_toman > 0),
  is_carried_forward boolean not null default false, -- برای روزهای تعطیل
  created_at timestamptz not null default now(),
  primary key (rate_date, rate_type, source_id)
);

-- ۷. آمار تجمیعی روزانه و ماهانه (پشتیبانی از تفکیک آگهی/معامله و کفایت داده)
create table if not exists public.market_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null,
  period_type text not null check (period_type in ('daily', 'monthly')),
  metric_type text not null check (metric_type in ('listing', 'transaction')),
  region_id smallint not null references public.regions(id),
  neighborhood_id uuid references public.neighborhoods(id),
  source_id uuid not null references public.data_sources(id),
  sample_count integer not null default 0,
  avg_price_per_sqm_toman bigint,
  median_price_per_sqm_toman bigint,
  min_price_per_sqm_toman bigint,
  max_price_per_sqm_toman bigint,
  transaction_count integer, -- فقط برای metric_type = 'transaction'
  is_sufficient_data boolean not null default false,
  insufficient_reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_market_stats_lookup
  on public.market_stats (metric_type, period_type, region_id, neighborhood_id, stat_date desc);

-- ۸. هشدارهای احتمالی موج قیمت (مبتنی بر شواهد تاریخی)
create table if not exists public.wave_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_date date not null,
  window_days smallint not null check (window_days in (7, 14, 30)),
  origin_region_id smallint references public.regions(id),
  target_region_id smallint not null references public.regions(id),
  target_neighborhood_id uuid references public.neighborhoods(id),
  metric_type text not null check (metric_type in ('listing', 'transaction')),
  price_change_pct numeric(6, 2),
  volume_change_pct numeric(6, 2),
  confidence_score numeric(4, 2) check (confidence_score between 0 and 1),
  historical_matches_count integer not null default 0,
  historical_non_matches_count integer not null default 0,
  evidence_summary text not null,
  created_at timestamptz not null default now()
);

-- فعال‌سازی RLS برای خواندن عمومی داده‌های مرجع و آمار تجمیعی
alter table public.regions enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.data_sources enable row level security;
alter table public.usd_rates enable row level security;
alter table public.market_stats enable row level security;
alter table public.wave_alerts enable row level security;

create policy "Public read regions" on public.regions for select using (true);
create policy "Public read neighborhoods" on public.neighborhoods for select using (true);
create policy "Public read data_sources" on public.data_sources for select using (true);
create policy "Public read usd_rates" on public.usd_rates for select using (true);
create policy "Public read market_stats" on public.market_stats for select using (true);
create policy "Public read wave_alerts" on public.wave_alerts for select using (true);
