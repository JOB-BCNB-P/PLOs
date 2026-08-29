-- ลงทะเบียนอีเมลล่วงหน้าได้ก่อนที่เจ้าตัวจะเข้าสู่ระบบครั้งแรก
-- เมื่อผู้ใช้ล็อกอินด้วย Google ครั้งแรก ระบบจะจับคู่อีเมลแล้วให้สิทธิ์/ผูกนักศึกษาอัตโนมัติ

-- 1) บัญชีรายชื่อบุคลากรที่ตั้งสิทธิ์ไว้ล่วงหน้า
create table if not exists public.pending_staff (
  email text primary key,
  display_name text,
  position_th text,
  department text,
  role public.app_role not null default 'lecturer',
  can_edit boolean not null default false,
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  applied_at timestamptz,
  applied_user_id uuid references public.profiles(id) on delete set null
);
comment on table public.pending_staff is 'รายชื่อบุคลากรที่กำหนดบทบาทไว้ล่วงหน้า ระบบจะนำไปใช้อัตโนมัติเมื่อเจ้าตัวเข้าสู่ระบบครั้งแรก แล้วบันทึก applied_at';
alter table public.pending_staff enable row level security;

drop policy if exists "admin read pending_staff" on public.pending_staff;
create policy "admin read pending_staff" on public.pending_staff for select to authenticated
  using (public.user_has_any_role(array['admin','executive','academic_affairs','program_chair']::public.app_role[]));
drop policy if exists "admin write pending_staff" on public.pending_staff;
create policy "admin write pending_staff" on public.pending_staff for all to authenticated
  using (public.user_has_any_role(array['admin']::public.app_role[]))
  with check (public.user_has_any_role(array['admin']::public.app_role[]));

-- 2) อีเมลสถาบันของนักศึกษา บันทึกล่วงหน้าได้ ใช้จับคู่ตอนล็อกอินครั้งแรก
alter table public.students add column if not exists email text;
comment on column public.students.email is 'อีเมลที่นักศึกษาจะใช้เข้าสู่ระบบ บันทึกล่วงหน้าได้ ระบบจะผูก student_access ให้อัตโนมัติเมื่อล็อกอินครั้งแรก';
create unique index if not exists students_email_unique_idx on public.students (lower(email)) where email is not null;

-- 3) ตอนสมัคร/ล็อกอินครั้งแรก: จับคู่อีเมลกับรายชื่อที่เตรียมไว้
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_pending public.pending_staff;
  v_student_id uuid;
  v_role public.app_role := 'student';
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'ผู้ใช้ใหม่'))
  on conflict (id) do nothing;

  -- ส่วนจับคู่ล่วงหน้าต้องไม่ทำให้การสมัครล้มเหลว จึงดักข้อผิดพลาดไว้ทั้งบล็อก
  begin
    if v_email <> '' then
      select * into v_pending from public.pending_staff where email = v_email;

      if v_pending.email is not null then
        v_role := v_pending.role;
        update public.profiles
           set display_name = coalesce(nullif(trim(v_pending.display_name), ''), display_name),
               position_th  = coalesce(v_pending.position_th, position_th),
               department   = coalesce(v_pending.department, department),
               can_edit     = v_pending.can_edit,
               updated_at   = now()
         where id = new.id;
        update public.pending_staff
           set applied_at = now(), applied_user_id = new.id
         where email = v_email;
      else
        select s.id into v_student_id from public.students s where lower(s.email) = v_email limit 1;
        if v_student_id is not null then
          insert into public.student_access (student_id, user_id, verified_at)
          values (v_student_id, new.id, now())
          on conflict (student_id) do update set user_id = excluded.user_id, verified_at = now();
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'handle_new_user: จับคู่รายชื่อล่วงหน้าไม่สำเร็จสำหรับ % (%)', v_email, sqlerrm;
  end;

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

-- 4) ใช้รายชื่อล่วงหน้ากับบัญชีที่ล็อกอินไปแล้ว (เรียกเองได้ หลังนำเข้า CSV)
create or replace function public.apply_pending_staff()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_count integer := 0;
begin
  if not public.user_has_any_role(array['admin']::public.app_role[]) then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่เรียกใช้ฟังก์ชันนี้ได้';
  end if;

  with matched as (
    select ps.email, ps.role, ps.can_edit, ps.display_name, ps.position_th, ps.department, p.id as user_id
    from public.pending_staff ps
    join public.profiles p on lower(p.email) = ps.email
    where ps.applied_at is null
  ), upd_profile as (
    update public.profiles p
       set display_name = coalesce(nullif(trim(m.display_name), ''), p.display_name),
           position_th  = coalesce(m.position_th, p.position_th),
           department   = coalesce(m.department, p.department),
           can_edit     = m.can_edit,
           updated_at   = now()
      from matched m where p.id = m.user_id
    returning p.id
  ), upd_role as (
    insert into public.user_roles (user_id, role, assigned_by)
    select m.user_id, m.role, auth.uid() from matched m
    on conflict (user_id) do update set role = excluded.role, assigned_by = auth.uid(), assigned_at = now()
    returning user_id
  )
  update public.pending_staff ps
     set applied_at = now(), applied_user_id = m.user_id
    from matched m where ps.email = m.email;
  get diagnostics v_count = row_count;

  -- ผูกบัญชีนักศึกษาที่บันทึกอีเมลไว้ล่วงหน้าและล็อกอินไปแล้ว
  insert into public.student_access (student_id, user_id, verified_at, verified_by)
  select s.id, p.id, now(), auth.uid()
  from public.students s
  join public.profiles p on lower(p.email) = lower(s.email)
  where s.email is not null
  on conflict (student_id) do update set user_id = excluded.user_id, verified_at = now(), verified_by = auth.uid();

  return v_count;
end;
$function$;

revoke all on function public.apply_pending_staff() from public, anon;
grant execute on function public.apply_pending_staff() to authenticated;
comment on function public.apply_pending_staff() is 'นำรายชื่อใน pending_staff และอีเมลนักศึกษาที่บันทึกไว้ ไปใช้กับบัญชีที่เข้าสู่ระบบไปแล้ว';
