-- คอลัมน์เพิ่มเติมเพื่อรองรับฟอร์มนำเข้า CSV งานทะเบียนและงานบุคลากร
alter table public.students  add column if not exists section text;
comment on column public.students.section is 'กลุ่มเรียน/หมู่เรียน เช่น A, B, 1, 2 (ว่างได้)';

alter table public.profiles  add column if not exists position_th text;
alter table public.profiles  add column if not exists department text;
comment on column public.profiles.position_th is 'ตำแหน่งทางวิชาการ/ตำแหน่งงาน เช่น อาจารย์, ผู้ช่วยศาสตราจารย์, นักวิชาการศึกษา';
comment on column public.profiles.department is 'ภาควิชา/กลุ่มงาน เช่น ภาควิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ';

alter table public.class_advisor_assignments add column if not exists advisor_kind text not null default 'class_advisor';
alter table public.class_advisor_assignments drop constraint if exists class_advisor_assignments_advisor_kind_check;
alter table public.class_advisor_assignments add constraint class_advisor_assignments_advisor_kind_check check (advisor_kind in ('class_advisor','co_advisor'));
comment on column public.class_advisor_assignments.advisor_kind is 'class_advisor = อาจารย์ที่ปรึกษาหลัก, co_advisor = อาจารย์ที่ปรึกษาร่วม';

-- ดัชนีที่จำเป็นสำหรับการ upsert จาก CSV
create unique index if not exists course_instructors_unique_idx
  on public.course_instructors (course_id, user_id, academic_year);
create unique index if not exists class_advisor_assignments_unique_idx
  on public.class_advisor_assignments (advisor_user_id, student_id, academic_year);
create unique index if not exists course_enrollments_unique_idx
  on public.course_enrollments (course_id, student_id, term);
