-- Staging-only import for the supplied Curriculum Mapping workbook.
-- Rows remain pending_review until canonical sub-PLO descriptions, semester, and course_type are confirmed.
create table if not exists public.curriculum_mapping_staging (
  id uuid primary key default gen_random_uuid(),
  curriculum_version text not null,
  year_level_text text not null,
  course_code text not null,
  course_name_th text not null,
  credits_text text,
  plo_code text not null,
  sub_plo_code text not null,
  mapping_level text not null check (mapping_level in ('I', 'R', 'M', 'P')),
  source_filename text not null,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved', 'rejected')),
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique (curriculum_version, course_code, plo_code, sub_plo_code, mapping_level)
);

create index if not exists idx_curriculum_mapping_staging_review
  on public.curriculum_mapping_staging(curriculum_version, review_status, course_code);

alter table public.curriculum_mapping_staging enable row level security;

drop policy if exists "staging_admin_read" on public.curriculum_mapping_staging;
drop policy if exists "staging_admin_write" on public.curriculum_mapping_staging;
create policy "staging_admin_read" on public.curriculum_mapping_staging
  for select to authenticated
  using (public.user_has_any_role(array['admin'::public.app_role, 'academic_affairs'::public.app_role, 'program_chair'::public.app_role]));
create policy "staging_admin_write" on public.curriculum_mapping_staging
  for all to authenticated
  using (public.user_has_any_role(array['admin'::public.app_role, 'academic_affairs'::public.app_role, 'program_chair'::public.app_role]))
  with check (public.user_has_any_role(array['admin'::public.app_role, 'academic_affairs'::public.app_role, 'program_chair'::public.app_role]));

comment on table public.curriculum_mapping_staging is
  'Candidate mapping imported from source workbooks; must be reviewed before writing curriculum_map.';
