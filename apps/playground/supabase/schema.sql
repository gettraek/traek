-- Traek Playground — Supabase schema
-- Run this in the Supabase SQL editor to initialize the database.

create extension if not exists "pgcrypto";

-- Auth: users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- Auth: sessions (Lucia v3)
create table if not exists sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null
);

-- Auth: magic link tokens
create table if not exists magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- App: user profiles
create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'team')),
  stripe_customer_id text,
  stripe_subscription_id text,
  encrypted_api_keys jsonb not null default '{}'
);

-- App: cloud conversations (paid tier)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null default 'New conversation',
  snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_updated_at on conversations(user_id, updated_at desc);

-- App: sharing links
create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  token uuid unique not null default gen_random_uuid(),
  conversation_id uuid,
  user_id uuid references users(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

-- RLS: restrict all tables to service role only (we use service role key server-side)
alter table users enable row level security;
alter table sessions enable row level security;
alter table magic_link_tokens enable row level security;
alter table user_profiles enable row level security;
alter table conversations enable row level security;
alter table shares enable row level security;
