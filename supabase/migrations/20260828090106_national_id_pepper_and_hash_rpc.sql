-- เก็บ pepper สำหรับ HMAC ของเลขบัตรประชาชน แยกจากตารางข้อมูล และปิดการอ่านจาก client ทุกกรณี
create extension if not exists pgcrypto;

create table if not exists public.app_secrets (
  key text primary key,
  value bytea not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
-- ไม่มี policy ใด ๆ = อ่าน/เขียนผ่าน client ไม่ได้เลย เข้าถึงได้เฉพาะฟังก์ชัน security definer

insert into public.app_secrets (key, value)
select 'national_id_pepper', gen_random_bytes(32)
where not exists (select 1 from public.app_secrets where key = 'national_id_pepper');
