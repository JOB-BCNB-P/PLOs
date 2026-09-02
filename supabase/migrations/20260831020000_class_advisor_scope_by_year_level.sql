-- อาจารย์ประจำชั้น: หนึ่งคนรับผิดชอบ "ทั้งชั้นปี" ไม่ใช่ไล่ทีละคน
-- มอบหมายเป็นขอบเขต (ชั้นปี + กลุ่ม) แถวเดียวครอบคลุมนักศึกษาทั้งชั้น และตามนักศึกษาที่ย้ายเข้า/ออกอัตโนมัติ
create table if not exists public.class_advisor_scopes (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references public.profiles(id) on delete cascade,
  academic_year integer not null,
  year_level smallint not null check (year_level between 1 and 6),
  section text not null default '*',
  advisor_kind text not null default 'class_advisor' check (advisor_kind in ('class_advisor','co_advisor')),
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (advisor_user_id, academic_year, year_level, section)
);
comment on table public.class_advisor_scopes is
  'ขอบเขตความรับผิดชอบของอาจารย์ประจำชั้น ระบุเป็นชั้นปี (+กลุ่ม) หนึ่งแถวครอบคลุมนักศึกษาทั้งชั้น; ปีการศึกษาที่นำเข้าล่าสุดคือปีที่มีผล';
comment on column public.class_advisor_scopes.section is
  '''*'' = ทุกกลุ่มในชั้นปีนั้น หรือระบุกลุ่มเจาะจงเมื่อชั้นปีหนึ่งมีที่ปรึกษาหลายคนแบ่งกลุ่มกัน';

create index if not exists class_advisor_scopes_lookup_idx
  on public.class_advisor_scopes (year_level, section) where is_active;

alter table public.class_advisor_scopes enable row level security;
drop policy if exists "staff read advisor scopes" on public.class_advisor_scopes;
create policy "staff read advisor scopes" on public.class_advisor_scopes for select to authenticated
  using (public.is_privileged() or advisor_user_id = (select auth.uid()));
drop policy if exists "admin write advisor scopes" on public.class_advisor_scopes;
create policy "admin write advisor scopes" on public.class_advisor_scopes for all to authenticated
  using (public.user_has_any_role(array['admin']::public.app_role[]))
  with check (public.user_has_any_role(array['admin']::public.app_role[]));

-- ที่ปรึกษาเห็นนักศึกษาได้จาก 3 ทาง: สิทธิ์ระดับบริหาร, ผูกรายคน, หรือขอบเขตชั้นปีที่รับผิดชอบ
create or replace function public.can_view_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select (select public.is_privileged())
    or exists (select 1 from public.student_access sa
                where sa.student_id = p_student_id and sa.user_id = (select auth.uid()))
    or exists (select 1 from public.class_advisor_assignments ca
                where ca.student_id = p_student_id and ca.advisor_user_id = (select auth.uid()))
    or exists (select 1
                 from public.class_advisor_scopes cs
                 join public.students s on s.id = p_student_id
                where cs.advisor_user_id = (select auth.uid())
                  and cs.is_active
                  and cs.year_level = s.current_year_level
                  and (cs.section = '*' or cs.section = s.section));
$function$;

comment on function public.can_view_student(uuid) is
  'ผู้มีสิทธิ์ระดับบริหาร, นักศึกษาเจ้าของระเบียน, ที่ปรึกษาที่ผูกรายคน หรือที่ปรึกษาประจำชั้นปีที่นักศึกษาอยู่';

-- สาขา class_advisor_scopes ของ import_csv_rows อยู่ในไฟล์
-- 20260828115331_extend_import_csv_rows_for_office_forms.sql ให้รันไฟล์นั้นซ้ำหลังไฟล์นี้
