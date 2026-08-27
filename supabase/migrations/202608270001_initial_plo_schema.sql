-- Clinical Aurora / PLOs Assessment System
-- Schema is intentionally designed around the per-student × per-PLO verdict.
-- Sensitive identity values are never stored in plaintext; national_id_hash stores a SHA-256 digest only.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'admin', 'executive', 'academic_affairs', 'program_chair', 'class_advisor', 'lecturer', 'student'
);
create type public.curriculum_status as enum ('draft', 'proposed', 'approved', 'active', 'archived');
create type public.mapping_level as enum ('I', 'R', 'M', 'P');
create type public.assessment_type as enum ('formative', 'summative');
create type public.achievement_status as enum ('achieved', 'not_achieved', 'pending');
create type public.cqi_status as enum ('open', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  can_edit boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'student',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create table public.curricula (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  name_th text not null,
  status public.curriculum_status not null default 'draft',
  effective_year integer not null check (effective_year between 2500 and 2700),
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plos (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete cascade,
  code text not null,
  description text not null,
  category text not null default 'professional' check (category in ('generic', 'professional')),
  display_order smallint not null check (display_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curriculum_id, code),
  unique (curriculum_id, display_order)
);

create table public.sub_plos (
  id uuid primary key default gen_random_uuid(),
  plo_id uuid not null references public.plos(id) on delete cascade,
  code text not null,
  description text not null,
  display_order smallint not null check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plo_id, code),
  unique (plo_id, display_order)
);

create table public.ylos (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete cascade,
  year_level smallint not null check (year_level between 1 and 6),
  code text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curriculum_id, code)
);

create table public.ylo_plo_map (
  ylo_id uuid not null references public.ylos(id) on delete cascade,
  plo_id uuid not null references public.plos(id) on delete cascade,
  weight numeric(6,3) not null default 1 check (weight > 0),
  primary key (ylo_id, plo_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete cascade,
  course_code text not null,
  name_th text not null,
  name_en text,
  credits numeric(4,1) not null default 0 check (credits >= 0),
  theory_hours numeric(6,1) not null default 0 check (theory_hours >= 0),
  practice_hours numeric(6,1) not null default 0 check (practice_hours >= 0),
  year_level smallint not null check (year_level between 1 and 6),
  semester smallint not null check (semester between 1 and 3),
  course_type text not null check (course_type in ('GE', 'professional_foundation', 'professional_theory', 'professional_practice')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curriculum_id, course_code)
);

create table public.clos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null,
  description text not null,
  display_order smallint not null check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, code),
  unique (course_id, display_order)
);

create table public.clo_plo_map (
  clo_id uuid not null references public.clos(id) on delete cascade,
  plo_id uuid not null references public.plos(id) on delete cascade,
  sub_plo_id uuid references public.sub_plos(id) on delete cascade,
  weight numeric(6,3) not null default 1 check (weight > 0),
  primary key (clo_id, plo_id, sub_plo_id)
);

create table public.curriculum_map (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  plo_id uuid references public.plos(id) on delete cascade,
  sub_plo_id uuid references public.sub_plos(id) on delete cascade,
  level public.mapping_level not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(plo_id, sub_plo_id) = 1),
  unique nulls not distinct (course_id, plo_id, sub_plo_id)
);

create table public.assessment_methods (
  id uuid primary key default gen_random_uuid(),
  clo_id uuid not null references public.clos(id) on delete cascade,
  method text not null,
  tool text not null,
  rubric_ref text,
  weight numeric(7,4) not null check (weight > 0 and weight <= 1),
  pass_threshold numeric(5,2),
  assessment_type public.assessment_type not null,
  workload_hours numeric(6,2) not null default 0 check (workload_hours >= 0),
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  full_name_th text not null,
  national_id_hash text not null unique check (length(national_id_hash) = 64),
  admit_year integer not null check (admit_year between 2500 and 2700),
  current_year_level smallint not null check (current_year_level between 1 and 6),
  curriculum_id uuid not null references public.curricula(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_access (
  student_id uuid primary key references public.students(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id) on delete set null
);

create table public.class_advisor_assignments (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year integer not null check (academic_year between 2500 and 2700),
  created_at timestamptz not null default now(),
  unique (advisor_user_id, student_id, academic_year)
);

create table public.course_instructors (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  academic_year integer not null check (academic_year between 2500 and 2700),
  created_at timestamptz not null default now(),
  unique (course_id, user_id, academic_year)
);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  term text not null,
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id, term)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assessment_method_id uuid not null references public.assessment_methods(id) on delete restrict,
  raw_score numeric(8,2) not null check (raw_score >= 0),
  competency_level numeric(4,2) not null check (competency_level >= 0 and competency_level <= 5),
  term text not null,
  attempt_no smallint not null default 1 check (attempt_no > 0),
  remediation_of uuid references public.scores(id) on delete set null,
  note text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (student_id, assessment_method_id, term, attempt_no)
);

create table public.sub_plo_achievement (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  sub_plo_id uuid not null references public.sub_plos(id) on delete cascade,
  term text not null,
  status public.achievement_status not null,
  computed_value numeric(5,2),
  source_score_ids jsonb not null default '[]'::jsonb,
  rule_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (student_id, sub_plo_id, term)
);

create table public.plo_achievement (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plo_id uuid not null references public.plos(id) on delete cascade,
  term text not null,
  status public.achievement_status not null,
  achieved_bool boolean,
  computed_value numeric(5,2),
  reason_text text not null,
  source_score_ids jsonb not null default '[]'::jsonb,
  rule_snapshot jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique (student_id, plo_id, term),
  check (
    (status = 'achieved' and achieved_bool = true)
    or (status = 'not_achieved' and achieved_bool = false)
    or (status = 'pending' and achieved_bool is null)
  )
);

create table public.verification (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete restrict,
  term text not null,
  committee text not null,
  result text not null,
  note text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.cqi_actions (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete restrict,
  plo_id uuid references public.plos(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  finding text not null,
  plan text not null,
  owner_user_id uuid references public.profiles(id) on delete set null,
  due_date date,
  status public.cqi_status not null default 'open',
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null,
  ref_id uuid not null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  uploaded_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid references public.curricula(id) on delete cascade,
  key text not null,
  value jsonb not null,
  description_th text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (curriculum_id, key)
);

create table public.standard_mapping (
  id uuid primary key default gen_random_uuid(),
  plo_id uuid not null references public.plos(id) on delete cascade,
  nursing_council_requirement text,
  edpex_item text,
  aunqa_criterion text,
  evidence_note text,
  unique (plo_id, nursing_council_requirement, edpex_item, aunqa_criterion)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_plos_curriculum on public.plos(curriculum_id);
create index idx_courses_curriculum on public.courses(curriculum_id);
create index idx_students_curriculum_cohort on public.students(curriculum_id, admit_year, current_year_level);
create index idx_scores_student_method_term on public.scores(student_id, assessment_method_id, term, recorded_at desc);
create index idx_plo_achievement_student_term on public.plo_achievement(student_id, term);
create index idx_plo_achievement_plo_term on public.plo_achievement(plo_id, term, status);
create index idx_audit_log_target on public.audit_log(target_table, record_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'ผู้ใช้ใหม่'))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.user_has_any_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and p.is_active = true
      and ur.role = any (p_roles)
  );
$$;

create or replace function public.is_privileged()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.user_has_any_role(array['admin','executive','academic_affairs','program_chair']::public.app_role[]);
$$;

create or replace function public.current_user_can_edit()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true and (p.can_edit = true or public.user_has_any_role(array['admin']::public.app_role[]))
  );
$$;

create or replace function public.can_view_student(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select public.is_privileged())
    or exists (select 1 from public.student_access sa where sa.student_id = p_student_id and sa.user_id = (select auth.uid()))
    or exists (select 1 from public.class_advisor_assignments ca where ca.student_id = p_student_id and ca.advisor_user_id = (select auth.uid()));
$$;

create or replace function public.can_view_curriculum(p_curriculum_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select public.user_has_any_role(array['admin','executive','academic_affairs','program_chair','class_advisor','lecturer']::public.app_role[]))
    or exists (
      select 1 from public.students s join public.student_access sa on sa.student_id = s.id
      where s.curriculum_id = p_curriculum_id and sa.user_id = (select auth.uid())
    );
$$;

create or replace function public.can_manage_course(p_course_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select public.is_privileged())
    or exists (select 1 from public.course_instructors ci where ci.course_id = p_course_id and ci.user_id = (select auth.uid()));
$$;

create or replace function public.can_record_assessment(p_assessment_method_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (select public.current_user_can_edit())
    and exists (
      select 1
      from public.assessment_methods am
      join public.clos cl on cl.id = am.clo_id
      where am.id = p_assessment_method_id
        and (select public.can_manage_course(cl.course_id))
    );
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  insert into public.audit_log (actor_user_id, action, target_table, record_id, old_data, new_data)
  values (
    auth.uid(), tg_op, tg_table_name,
    coalesce(new.id::text, old.id::text, ''),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.grant_edit_permission(p_user_id uuid, p_can_edit boolean, p_reason text)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare v_row public.profiles;
begin
  if not (select public.user_has_any_role(array['admin']::public.app_role[])) then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนสิทธิ์แก้ไขได้';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'ต้องระบุเหตุผลเมื่อเปลี่ยนสิทธิ์แก้ไข';
  end if;
  update public.profiles set can_edit = p_can_edit where id = p_user_id returning * into v_row;
  if not found then raise exception 'ไม่พบผู้ใช้'; end if;
  insert into public.audit_log (actor_user_id, action, target_table, record_id, new_data, reason)
  values (auth.uid(), 'GRANT_EDIT_PERMISSION', 'profiles', p_user_id::text, jsonb_build_object('can_edit', p_can_edit), p_reason);
  return v_row;
end;
$$;

create or replace function public.get_curriculum_setting(p_curriculum_id uuid, p_key text, p_default jsonb)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select coalesce((select value from public.settings where curriculum_id = p_curriculum_id and key = p_key), p_default);
$$;

create or replace function public.recalculate_student_plo(p_student_id uuid, p_plo_id uuid, p_term text)
returns public.achievement_status
language plpgsql
security definer set search_path = public
as $$
declare
  v_curriculum_id uuid;
  v_pass_level numeric(4,2);
  v_levels public.mapping_level[];
  v_rule text;
  v_sub record;
  v_sub_count integer;
  v_required integer;
  v_found integer;
  v_value numeric(5,2);
  v_status public.achievement_status;
  v_source_ids jsonb;
  v_all_sources jsonb := '[]'::jsonb;
  v_pending_count integer;
  v_achieved_count integer;
  v_average numeric(5,2);
  v_reason text;
  v_snapshot jsonb;
begin
  if not (select public.current_user_can_edit()) then
    raise exception 'ไม่มีสิทธิ์คำนวณผลการประเมิน';
  end if;

  select s.curriculum_id into v_curriculum_id from public.students s where s.id = p_student_id;
  if v_curriculum_id is null or not exists (select 1 from public.plos p where p.id = p_plo_id and p.curriculum_id = v_curriculum_id) then
    raise exception 'นักศึกษาหรือ PLO ไม่อยู่ในหลักสูตรเดียวกัน';
  end if;

  v_pass_level := coalesce((select public.get_curriculum_setting(v_curriculum_id, 'pass_level', '3.51'::jsonb) #>> '{}')::numeric, 3.51);
  select coalesce(array_agg(level_text::public.mapping_level), array['M','P']::public.mapping_level[])
    into v_levels
  from jsonb_array_elements_text(public.get_curriculum_setting(v_curriculum_id, 'decision_levels', '["M","P"]'::jsonb)) level_text;
  v_rule := coalesce(public.get_curriculum_setting(v_curriculum_id, 'sub_plo_aggregation_rule', '"all"'::jsonb) #>> '{}', 'all');
  v_snapshot := jsonb_build_object('pass_level', v_pass_level, 'decision_levels', to_jsonb(v_levels), 'sub_plo_aggregation_rule', v_rule, 'remediation_rule', public.get_curriculum_setting(v_curriculum_id, 'remediation_rule', '"latest"'::jsonb));

  select count(*) into v_sub_count from public.sub_plos where plo_id = p_plo_id;

  if v_sub_count > 0 then
    for v_sub in select id, code from public.sub_plos where plo_id = p_plo_id order by display_order loop
      select count(distinct am.id)
        into v_required
      from public.assessment_methods am
      join public.clos cl on cl.id = am.clo_id
      join public.curriculum_map cm on cm.course_id = cl.course_id and cm.sub_plo_id = v_sub.id
      where am.is_active and cm.level = any(v_levels);

      with latest_scores as (
        select distinct on (s.assessment_method_id) s.id, s.assessment_method_id, s.competency_level
        from public.scores s
        join public.assessment_methods am on am.id = s.assessment_method_id
        join public.clos cl on cl.id = am.clo_id
        join public.curriculum_map cm on cm.course_id = cl.course_id and cm.sub_plo_id = v_sub.id
        where s.student_id = p_student_id and s.term = p_term and am.is_active and cm.level = any(v_levels)
        order by s.assessment_method_id, s.recorded_at desc, s.attempt_no desc
      )
      select count(*), round(sum(ls.competency_level * am.weight) / nullif(sum(am.weight), 0), 2), coalesce(jsonb_agg(ls.id), '[]'::jsonb)
        into v_found, v_value, v_source_ids
      from latest_scores ls join public.assessment_methods am on am.id = ls.assessment_method_id;

      if v_required = 0 or v_found < v_required then
        v_status := 'pending';
        v_reason := format('ยังไม่ตัดสิน %s: มีผลระดับ M/P ไม่ครบ (%s จาก %s จุดวัด)', v_sub.code, v_found, v_required);
      elsif v_value >= v_pass_level then
        v_status := 'achieved';
        v_reason := format('ผ่าน %s: ค่าถ่วงน้ำหนัก %s ≥ เกณฑ์ %s', v_sub.code, v_value, v_pass_level);
      else
        v_status := 'not_achieved';
        v_reason := format('ไม่ผ่าน %s: ค่าถ่วงน้ำหนัก %s < เกณฑ์ %s', v_sub.code, v_value, v_pass_level);
      end if;

      insert into public.sub_plo_achievement (student_id, sub_plo_id, term, status, computed_value, source_score_ids, rule_snapshot)
      values (p_student_id, v_sub.id, p_term, v_status, v_value, v_source_ids, v_snapshot)
      on conflict (student_id, sub_plo_id, term) do update set status = excluded.status, computed_value = excluded.computed_value, source_score_ids = excluded.source_score_ids, rule_snapshot = excluded.rule_snapshot, updated_at = now();
    end loop;

    select count(*) filter (where status = 'pending'), count(*) filter (where status = 'achieved'), round(avg(computed_value), 2), coalesce(jsonb_agg(source_score_ids), '[]'::jsonb)
      into v_pending_count, v_achieved_count, v_average, v_all_sources
    from public.sub_plo_achievement where student_id = p_student_id and term = p_term and sub_plo_id in (select id from public.sub_plos where plo_id = p_plo_id);

    if v_pending_count > 0 then
      v_status := 'pending';
      v_reason := format('ยังไม่ตัดสิน: มี sub-PLO ที่ผลระดับ M/P ยังไม่ครบ %s ข้อ', v_pending_count);
    elsif v_rule = 'all' and v_achieved_count = v_sub_count then
      v_status := 'achieved';
      v_reason := format('ผ่าน PLO: ผ่าน sub-PLO ครบทุกข้อ (%s/%s)', v_achieved_count, v_sub_count);
    elsif v_rule = 'all' then
      v_status := 'not_achieved';
      v_reason := format('ไม่ผ่าน PLO: ผ่าน sub-PLO %s/%s ซึ่งไม่ครบตามกฎต้องผ่านทุกข้อ', v_achieved_count, v_sub_count);
    else
      v_status := case when v_average >= v_pass_level then 'achieved'::public.achievement_status else 'not_achieved'::public.achievement_status end;
      v_reason := format('ผล PLO ตามกฎ %s: ค่าเฉลี่ย sub-PLO %s เทียบเกณฑ์ %s', v_rule, v_average, v_pass_level);
    end if;
  else
    select count(distinct am.id)
      into v_required
    from public.assessment_methods am
    join public.clos cl on cl.id = am.clo_id
    join public.curriculum_map cm on cm.course_id = cl.course_id and cm.plo_id = p_plo_id
    where am.is_active and cm.level = any(v_levels);

    with latest_scores as (
      select distinct on (s.assessment_method_id) s.id, s.assessment_method_id, s.competency_level
      from public.scores s
      join public.assessment_methods am on am.id = s.assessment_method_id
      join public.clos cl on cl.id = am.clo_id
      join public.curriculum_map cm on cm.course_id = cl.course_id and cm.plo_id = p_plo_id
      where s.student_id = p_student_id and s.term = p_term and am.is_active and cm.level = any(v_levels)
      order by s.assessment_method_id, s.recorded_at desc, s.attempt_no desc
    )
    select count(*), round(sum(ls.competency_level * am.weight) / nullif(sum(am.weight), 0), 2), coalesce(jsonb_agg(ls.id), '[]'::jsonb)
      into v_found, v_value, v_source_ids
    from latest_scores ls join public.assessment_methods am on am.id = ls.assessment_method_id;
    v_all_sources := v_source_ids;
    if v_required = 0 or v_found < v_required then
      v_status := 'pending';
      v_reason := format('ยังไม่ตัดสิน: มีผลระดับ M/P ไม่ครบ (%s จาก %s จุดวัด)', v_found, v_required);
    elsif v_value >= v_pass_level then
      v_status := 'achieved';
      v_reason := format('ผ่าน PLO: ค่าถ่วงน้ำหนัก %s ≥ เกณฑ์ %s', v_value, v_pass_level);
    else
      v_status := 'not_achieved';
      v_reason := format('ไม่ผ่าน PLO: ค่าถ่วงน้ำหนัก %s < เกณฑ์ %s', v_value, v_pass_level);
    end if;
    v_average := v_value;
  end if;

  insert into public.plo_achievement (student_id, plo_id, term, status, achieved_bool, computed_value, reason_text, source_score_ids, rule_snapshot)
  values (p_student_id, p_plo_id, p_term, v_status, case when v_status = 'achieved' then true when v_status = 'not_achieved' then false else null end, v_average, v_reason, v_all_sources, v_snapshot)
  on conflict (student_id, plo_id, term) do update set status = excluded.status, achieved_bool = excluded.achieved_bool, computed_value = excluded.computed_value, reason_text = excluded.reason_text, source_score_ids = excluded.source_score_ids, rule_snapshot = excluded.rule_snapshot, calculated_at = now();

  return v_status;
end;
$$;

create or replace function public.record_score(
  p_student_id uuid,
  p_assessment_method_id uuid,
  p_raw_score numeric,
  p_competency_level numeric,
  p_term text,
  p_attempt_no smallint default 1,
  p_remediation_of uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_score_id uuid;
  v_plo_id uuid;
begin
  if not (select public.can_record_assessment(p_assessment_method_id)) then
    raise exception 'ไม่มีสิทธิ์บันทึกผลการวัดนี้';
  end if;
  insert into public.scores (student_id, assessment_method_id, raw_score, competency_level, term, attempt_no, remediation_of, note, recorded_by)
  values (p_student_id, p_assessment_method_id, p_raw_score, p_competency_level, p_term, p_attempt_no, p_remediation_of, p_note, auth.uid())
  returning id into v_score_id;

  for v_plo_id in
    select distinct coalesce(cm.plo_id, sp.plo_id)
    from public.assessment_methods am
    join public.clos cl on cl.id = am.clo_id
    join public.curriculum_map cm on cm.course_id = cl.course_id
    left join public.sub_plos sp on sp.id = cm.sub_plo_id
    where am.id = p_assessment_method_id
  loop
    perform public.recalculate_student_plo(p_student_id, v_plo_id, p_term);
  end loop;
  return v_score_id;
end;
$$;

create or replace function public.log_personal_data_access(p_target_table text, p_record_id text, p_reason text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  insert into public.audit_log (actor_user_id, action, target_table, record_id, reason)
  values (auth.uid(), 'READ_PERSONAL_DATA', p_target_table, p_record_id, p_reason);
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger curricula_updated_at before update on public.curricula for each row execute procedure public.set_updated_at();
create trigger plos_updated_at before update on public.plos for each row execute procedure public.set_updated_at();
create trigger sub_plos_updated_at before update on public.sub_plos for each row execute procedure public.set_updated_at();
create trigger ylos_updated_at before update on public.ylos for each row execute procedure public.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute procedure public.set_updated_at();
create trigger clos_updated_at before update on public.clos for each row execute procedure public.set_updated_at();
create trigger assessment_methods_updated_at before update on public.assessment_methods for each row execute procedure public.set_updated_at();
create trigger students_updated_at before update on public.students for each row execute procedure public.set_updated_at();
create trigger cqi_actions_updated_at before update on public.cqi_actions for each row execute procedure public.set_updated_at();

create trigger profiles_audit after insert or update or delete on public.profiles for each row execute procedure public.write_audit_log();
create trigger user_roles_audit after insert or update or delete on public.user_roles for each row execute procedure public.write_audit_log();
create trigger scores_audit after insert or update or delete on public.scores for each row execute procedure public.write_audit_log();
create trigger settings_audit after insert or update or delete on public.settings for each row execute procedure public.write_audit_log();
create trigger curriculum_map_audit after insert or update or delete on public.curriculum_map for each row execute procedure public.write_audit_log();
create trigger assessment_methods_audit after insert or update or delete on public.assessment_methods for each row execute procedure public.write_audit_log();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.curricula enable row level security;
alter table public.plos enable row level security;
alter table public.sub_plos enable row level security;
alter table public.ylos enable row level security;
alter table public.ylo_plo_map enable row level security;
alter table public.courses enable row level security;
alter table public.clos enable row level security;
alter table public.clo_plo_map enable row level security;
alter table public.curriculum_map enable row level security;
alter table public.assessment_methods enable row level security;
alter table public.students enable row level security;
alter table public.student_access enable row level security;
alter table public.class_advisor_assignments enable row level security;
alter table public.course_instructors enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.scores enable row level security;
alter table public.sub_plo_achievement enable row level security;
alter table public.plo_achievement enable row level security;
alter table public.verification enable row level security;
alter table public.cqi_actions enable row level security;
alter table public.evidence enable row level security;
alter table public.settings enable row level security;
alter table public.standard_mapping enable row level security;
alter table public.audit_log enable row level security;

create policy "Profiles can be read by owner or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.user_has_any_role(array['admin']::public.app_role[])));
create policy "Roles can be read by owner or admin" on public.user_roles for select to authenticated using (user_id = (select auth.uid()) or (select public.user_has_any_role(array['admin']::public.app_role[])));
create policy "Admin manages profiles" on public.profiles for all to authenticated using ((select public.user_has_any_role(array['admin']::public.app_role[]))) with check ((select public.user_has_any_role(array['admin']::public.app_role[])));
create policy "Admin manages roles" on public.user_roles for all to authenticated using ((select public.user_has_any_role(array['admin']::public.app_role[]))) with check ((select public.user_has_any_role(array['admin']::public.app_role[])));

create policy "Curriculum visible to related users" on public.curricula for select to authenticated using ((select public.can_view_curriculum(id)));
create policy "PLO visible to related users" on public.plos for select to authenticated using ((select public.can_view_curriculum(curriculum_id)));
create policy "Sub PLO visible to related users" on public.sub_plos for select to authenticated using (exists (select 1 from public.plos p where p.id = sub_plos.plo_id and (select public.can_view_curriculum(p.curriculum_id))));
create policy "YLO visible to related users" on public.ylos for select to authenticated using ((select public.can_view_curriculum(curriculum_id)));
create policy "YLO mapping visible to related users" on public.ylo_plo_map for select to authenticated using (exists (select 1 from public.ylos y where y.id = ylo_plo_map.ylo_id and (select public.can_view_curriculum(y.curriculum_id))));
create policy "Courses visible to related users" on public.courses for select to authenticated using ((select public.can_view_curriculum(curriculum_id)));
create policy "CLO visible to related users" on public.clos for select to authenticated using (exists (select 1 from public.courses c where c.id = clos.course_id and (select public.can_view_curriculum(c.curriculum_id))));
create policy "CLO mapping visible to related users" on public.clo_plo_map for select to authenticated using (exists (select 1 from public.clos cl join public.courses c on c.id = cl.course_id where cl.id = clo_plo_map.clo_id and (select public.can_view_curriculum(c.curriculum_id))));
create policy "Curriculum map visible to related users" on public.curriculum_map for select to authenticated using (exists (select 1 from public.courses c where c.id = curriculum_map.course_id and (select public.can_view_curriculum(c.curriculum_id))));
create policy "Assessment plans visible to related users" on public.assessment_methods for select to authenticated using (exists (select 1 from public.clos cl join public.courses c on c.id = cl.course_id where cl.id = assessment_methods.clo_id and (select public.can_view_curriculum(c.curriculum_id))));
create policy "Privileged edit curriculum objects" on public.curricula for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit PLO objects" on public.plos for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit sub PLO objects" on public.sub_plos for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit YLO objects" on public.ylos for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit YLO mapping" on public.ylo_plo_map for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit courses" on public.courses for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit CLOs" on public.clos for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit CLO mapping" on public.clo_plo_map for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit curriculum mapping" on public.curriculum_map for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Privileged edit assessment methods" on public.assessment_methods for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));

create policy "Student data visible in assigned scope" on public.students for select to authenticated using ((select public.can_view_student(id)) or exists (select 1 from public.course_enrollments ce join public.course_instructors ci on ci.course_id = ce.course_id where ce.student_id = students.id and ci.user_id = (select auth.uid())));
create policy "Privileged manage students" on public.students for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Student access visible to owner or admin" on public.student_access for select to authenticated using (user_id = (select auth.uid()) or (select public.user_has_any_role(array['admin']::public.app_role[])));
create policy "Admin manages student access" on public.student_access for all to authenticated using ((select public.user_has_any_role(array['admin']::public.app_role[]))) with check ((select public.user_has_any_role(array['admin']::public.app_role[])));
create policy "Advisor assignments visible to advisor or privileged" on public.class_advisor_assignments for select to authenticated using (advisor_user_id = (select auth.uid()) or (select public.is_privileged()));
create policy "Privileged manages advisor assignments" on public.class_advisor_assignments for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Course instructor assignments visible to instructor or privileged" on public.course_instructors for select to authenticated using (user_id = (select auth.uid()) or (select public.is_privileged()));
create policy "Privileged manages course instructors" on public.course_instructors for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Enrollments visible in teaching or student scope" on public.course_enrollments for select to authenticated using ((select public.can_view_student(student_id)) or (select public.can_manage_course(course_id)));
create policy "Privileged manages enrollments" on public.course_enrollments for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));

create policy "Scores visible in assigned scope" on public.scores for select to authenticated using ((select public.can_view_student(student_id)) or exists (select 1 from public.assessment_methods am join public.clos cl on cl.id = am.clo_id where am.id = scores.assessment_method_id and (select public.can_manage_course(cl.course_id))));
create policy "Achievement visible in student scope" on public.sub_plo_achievement for select to authenticated using ((select public.can_view_student(student_id)));
create policy "PLO achievement visible in student scope" on public.plo_achievement for select to authenticated using ((select public.can_view_student(student_id)));
create policy "Verification visible to privileged users" on public.verification for select to authenticated using ((select public.is_privileged()));
create policy "Privileged manages verification" on public.verification for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "CQI visible in assigned scope" on public.cqi_actions for select to authenticated using ((select public.is_privileged()) or owner_user_id = (select auth.uid()) or (student_id is not null and (select public.can_view_student(student_id))));
create policy "CQI editable by privileged owner" on public.cqi_actions for all to authenticated using ((select public.current_user_can_edit()) and ((select public.is_privileged()) or owner_user_id = (select auth.uid()))) with check ((select public.current_user_can_edit()) and ((select public.is_privileged()) or owner_user_id = (select auth.uid())));
create policy "Evidence visible to privileged uploader" on public.evidence for select to authenticated using ((select public.is_privileged()) or uploaded_by = (select auth.uid()));
create policy "Evidence inserted by active editors" on public.evidence for insert to authenticated with check ((select public.current_user_can_edit()) and uploaded_by = (select auth.uid()));
create policy "Settings visible to privileged users" on public.settings for select to authenticated using ((select public.is_privileged()));
create policy "Admin or chair edits settings" on public.settings for all to authenticated using ((select public.current_user_can_edit()) and (select public.user_has_any_role(array['admin','program_chair']::public.app_role[]))) with check ((select public.current_user_can_edit()) and (select public.user_has_any_role(array['admin','program_chair']::public.app_role[])));
create policy "Standard mapping visible in curriculum scope" on public.standard_mapping for select to authenticated using (exists (select 1 from public.plos p where p.id = standard_mapping.plo_id and (select public.can_view_curriculum(p.curriculum_id))));
create policy "Privileged manages standard mapping" on public.standard_mapping for all to authenticated using ((select public.is_privileged()) and (select public.current_user_can_edit())) with check ((select public.is_privileged()) and (select public.current_user_can_edit()));
create policy "Admin views audit log" on public.audit_log for select to authenticated using ((select public.user_has_any_role(array['admin']::public.app_role[])));

grant execute on function public.grant_edit_permission(uuid, boolean, text) to authenticated;
grant execute on function public.record_score(uuid, uuid, numeric, numeric, text, smallint, uuid, text) to authenticated;
grant execute on function public.recalculate_student_plo(uuid, uuid, text) to authenticated;
grant execute on function public.log_personal_data_access(text, text, text) to authenticated;

-- Approved seed: Programme version 2565 (active), Programme version 2570 (draft), and configurable §5A defaults.
insert into public.curricula (version, name_th, status, effective_year, description)
values
  ('2565', 'หลักสูตรพยาบาลศาสตรบัณฑิต หลักสูตรปรับปรุง พ.ศ. 2565', 'active', 2565, 'หลักสูตรที่ใช้งานจริง มีนักศึกษาเรียนอยู่'),
  ('2570', 'หลักสูตรพยาบาลศาสตรบัณฑิต หลักสูตรปรับปรุง พ.ศ. 2570', 'draft', 2570, 'หลักสูตรร่าง ห้ามนำผลไปตัดสินจริงจนกว่าจะประกาศใช้');

insert into public.plos (curriculum_id, code, description, category, display_order)
select c.id, x.code, x.description, 'professional', x.display_order
from public.curricula c
join (values
  ('PLO1', 'ประยุกต์ความรู้ทางการพยาบาล การผดุงครรภ์และบูรณาการศาสตร์ที่เกี่ยวข้องในการให้บริการสุขภาพทุกช่วงวัย ในภาวะปกติและเจ็บป่วย', 1),
  ('PLO2', 'ปฏิบัติการพยาบาลและการผดุงครรภ์แบบองค์รวมด้วยหัวใจความเป็นมนุษย์ โดยใช้กระบวนการพยาบาล บนหลักฐานเชิงประจักษ์ คำนึงถึงความปลอดภัย การใช้ยาอย่างสมเหตุผล ความหลากหลายทางวัฒนธรรม ภายใต้กฎหมายและจรรยาบรรณวิชาชีพ', 2),
  ('PLO3', 'แสดงออกถึงพฤติกรรมด้านคุณธรรม จริยธรรม จรรยาบรรณวิชาชีพ เจตคติที่ดีต่อวิชาชีพและสิทธิพยาบาล', 3),
  ('PLO4', 'แสดงออกถึงทักษะการคิดขั้นสูงในการตัดสินใจแก้ปัญหา การคิดอย่างมีวิจารณญาณและสร้างสรรค์', 4),
  ('PLO5', 'ประยุกต์ความรู้ระเบียบวิธีวิจัยในการปฏิบัติการพยาบาล การผดุงครรภ์ และร่วมออกแบบหรือพัฒนานวัตกรรมการดูแลสุขภาพ', 5),
  ('PLO6', 'แสดงออกถึงการมีภาวะผู้นำ และสามารถบริหารจัดการสุขภาวะชุมชน', 6),
  ('PLO7', 'ใช้ภาษาในการสื่อสารได้อย่างเหมาะสมและเป็นสากล', 7),
  ('PLO8', 'ใช้สื่อสารสนเทศและเทคโนโลยีดิจิทัลที่เหมาะสมในการเรียนรู้และปฏิบัติการพยาบาลและการผดุงครรภ์', 8),
  ('PLO9', 'แสดงออกถึงการมีทักษะชีวิต โดยยึดหลักปรัชญาเศรษฐกิจพอเพียง เพื่อพัฒนาตนเอง วิชาชีพ และสังคม', 9),
  ('PLO10', 'ประยุกต์แนวคิดการเป็นผู้ประกอบการด้านสุขภาพได้อย่างเหมาะสม', 10)
) as x(code, description, display_order) on c.version = '2565';

insert into public.plos (curriculum_id, code, description, category, display_order)
select c.id, x.code, x.description, 'professional', x.display_order
from public.curricula c
join (values
  ('PLO1', 'ประยุกต์ใช้ศาสตร์ทางการพยาบาลและการผดุงครรภ์ แนวคิดการดูแลสุขภาพปฐมภูมิที่เน้นการพยาบาลอาชีวอนามัยและการดูแลในภาวะฉุกเฉิน โดยใช้หลักฐานเชิงประจักษ์และศาสตร์ที่เกี่ยวข้อง', 1),
  ('PLO2', 'ปฏิบัติการพยาบาล การผดุงครรภ์ การพยาบาลอาชีวอนามัย และการดูแลในภาวะฉุกเฉินด้วยหัวใจความเป็นมนุษย์ ในการดูแลภาวะสุขภาพของบุคคล ครอบครัว และชุมชน โดยใช้หลักฐานเชิงประจักษ์ตามมาตรฐานวิชาชีพ', 2),
  ('PLO3', 'แสดงพฤติกรรมตามหลักจริยธรรมและจรรยาบรรณวิชาชีพ', 3),
  ('PLO4', 'แสดงพฤติกรรมภาวะผู้นำในการใช้แนวคิดการดูแลสุขภาพปฐมภูมิสู่งานสาธารณสุขมูลฐานด้วย สบช. โมเดล ที่มุ่งเน้นการพยาบาลอาชีวอนามัยและการดูแลในภาวะฉุกเฉิน', 4),
  ('PLO5', 'แสดงพฤติกรรมที่สะท้อนถึงอัตลักษณ์สถาบัน', 5),
  ('PLO6', 'ร่วมพัฒนาวิจัยหรือต้นแบบนวัตกรรมทางการพยาบาล', 6),
  ('PLO7', 'ใช้เทคโนโลยีดิจิทัลเพื่อปฏิบัติการพยาบาลและการผดุงครรภ์', 7),
  ('PLO8', 'แสดงพฤติกรรมการพัฒนาตนเองและมีความยืดหยุ่นในการปรับตัว', 8),
  ('PLO9', 'สื่อสารเชิงวิชาชีพกับผู้รับบริการและเครือข่ายอย่างสร้างสรรค์', 9)
) as x(code, description, display_order) on c.version = '2570';

insert into public.settings (curriculum_id, key, value, description_th)
select c.id, x.key, x.value::jsonb, x.description_th
from public.curricula c
cross join (values
  ('pass_level', '3.51', 'เกณฑ์ผ่านขั้นต่ำของคะแนนระดับสมรรถนะ 0–5.00'),
  ('decision_levels', '["M","P"]', 'ระดับ Curriculum Mapping ที่ใช้ตัดสินผล PLO'),
  ('sub_plo_aggregation_rule', '"all"', 'กฎรวม sub-PLO เป็น PLO: ต้องผ่านครบทุกข้อ'),
  ('remediation_rule', '"latest"', 'กฎใช้ผลซ่อมเสริม: ใช้ผลการบันทึกล่าสุด'),
  ('retention_years', '10', 'ระยะเวลาเก็บข้อมูลส่วนบุคคลเป็นปี'),
  ('pending_grace_days', '90', 'จำนวนวันก่อนแจ้งเตือนสถานะ Pending ที่ยาวนานผิดปกติ'),
  ('competency_scale', '[{"label":"ต้องปรับปรุง","min":0,"max":3.50,"percent":"<60","pass":false},{"label":"พอใช้","min":3.51,"max":4.00,"percent":"60–69.99","pass":true},{"label":"มาก (ดี)","min":4.01,"max":4.50,"percent":"70–79.99","pass":true},{"label":"มากที่สุด (ดีมาก)","min":4.51,"max":5.00,"percent":"≥80","pass":true}]', 'ตารางแปลผลระดับสมรรถนะที่ผู้มีสิทธิ์สามารถปรับได้')
) as x(key, value, description_th);

insert into public.standard_mapping (plo_id, nursing_council_requirement, edpex_item, aunqa_criterion, evidence_note)
select p.id, 'สมรรถนะผู้สำเร็จการศึกษาตามมาตรฐานสภาการพยาบาล', 'หมวด 6 และ 7.1', 'C1, C2, C4, C8', 'ใช้ PLO/CLO map, ผลการวัดรายบุคคล, การทวนสอบ และหลักฐาน CQI'
from public.plos p;
