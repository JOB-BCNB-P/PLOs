-- ผู้ใช้หนึ่งคนถือได้หลายบทบาทพร้อมกัน เช่น ผู้บริหาร + ประธานหลักสูตร + อาจารย์ผู้สอน
-- สิทธิ์ที่ได้คือ "สหภาพ" ของทุกบทบาท ส่วนขอบเขตข้อมูล (นักศึกษาคนไหน วิชาไหน)
-- ยังมาจากตารางมอบหมาย class_advisor_assignments / course_instructors เช่นเดิม
alter table public.user_roles drop constraint if exists user_roles_pkey;
alter table public.user_roles add constraint user_roles_pkey primary key (user_id, role);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
comment on table public.user_roles is 'บทบาทของผู้ใช้ หนึ่งคนมีได้หลายแถว สิทธิ์รวมเป็นสหภาพของทุกบทบาท';

alter table public.pending_staff add column if not exists roles public.app_role[];
update public.pending_staff set roles = array[role]::public.app_role[] where roles is null;
alter table public.pending_staff alter column roles set default array['lecturer']::public.app_role[];
alter table public.pending_staff alter column roles set not null;
alter table public.pending_staff drop column if exists role;
comment on column public.pending_staff.roles is 'บทบาทที่จะให้เมื่อเจ้าตัวเข้าสู่ระบบครั้งแรก ระบุได้หลายบทบาท';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_pending public.pending_staff;
  v_student_id uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'ผู้ใช้ใหม่'))
  on conflict (id) do nothing;

  begin
    if v_email <> '' then
      select * into v_pending from public.pending_staff where email = v_email;

      if v_pending.email is not null then
        update public.profiles
           set display_name = coalesce(nullif(trim(v_pending.display_name), ''), display_name),
               position_th  = coalesce(v_pending.position_th, position_th),
               department   = coalesce(v_pending.department, department),
               can_edit     = v_pending.can_edit,
               updated_at   = now()
         where id = new.id;
        insert into public.user_roles (user_id, role)
        select new.id, r from unnest(v_pending.roles) r
        on conflict (user_id, role) do nothing;
        update public.pending_staff set applied_at = now(), applied_user_id = new.id where email = v_email;
        return new;
      end if;

      select s.id into v_student_id from public.students s where lower(s.email) = v_email limit 1;
      if v_student_id is not null then
        insert into public.student_access (student_id, user_id, verified_at)
        values (v_student_id, new.id, now())
        on conflict (student_id) do update set user_id = excluded.user_id, verified_at = now();
      end if;
    end if;
  exception when others then
    raise warning 'handle_new_user: จับคู่รายชื่อล่วงหน้าไม่สำเร็จสำหรับ % (%)', v_email, sqlerrm;
  end;

  insert into public.user_roles (user_id, role) values (new.id, 'student'::public.app_role)
  on conflict (user_id, role) do nothing;
  return new;
end;
$function$;

create or replace function public.apply_pending_staff()
returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare v_count integer := 0; v_row record;
begin
  if not public.user_has_any_role(array['admin']::public.app_role[]) then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่เรียกใช้ฟังก์ชันนี้ได้';
  end if;

  for v_row in
    select ps.email, ps.roles, ps.can_edit, ps.display_name, ps.position_th, ps.department, p.id as user_id
    from public.pending_staff ps
    join public.profiles p on lower(p.email) = ps.email
    where ps.applied_at is null
  loop
    update public.profiles
       set display_name = coalesce(nullif(trim(v_row.display_name), ''), display_name),
           position_th  = coalesce(v_row.position_th, position_th),
           department   = coalesce(v_row.department, department),
           can_edit     = v_row.can_edit,
           updated_at   = now()
     where id = v_row.user_id;
    delete from public.user_roles where user_id = v_row.user_id and role <> all (v_row.roles);
    insert into public.user_roles (user_id, role, assigned_by)
    select v_row.user_id, r, auth.uid() from unnest(v_row.roles) r
    on conflict (user_id, role) do nothing;
    update public.pending_staff set applied_at = now(), applied_user_id = v_row.user_id where email = v_row.email;
    v_count := v_count + 1;
  end loop;

  insert into public.student_access (student_id, user_id, verified_at, verified_by)
  select s.id, p.id, now(), auth.uid()
  from public.students s join public.profiles p on lower(p.email) = lower(s.email)
  where s.email is not null
  on conflict (student_id) do update set user_id = excluded.user_id, verified_at = now(), verified_by = auth.uid();

  return v_count;
end;
$function$;

revoke all on function public.apply_pending_staff() from public, anon;
grant execute on function public.apply_pending_staff() to authenticated;

-- import_csv_rows ฉบับที่รองรับหลายบทบาทอยู่ในไฟล์
-- 20260828115331_extend_import_csv_rows_for_office_forms.sql ให้รันไฟล์นั้นซ้ำหลังไฟล์นี้
