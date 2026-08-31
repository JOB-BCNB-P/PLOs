-- เมื่อเปลี่ยนมาเข้าสู่ระบบด้วยอีเมล เลขบัตรประชาชนไม่ได้ใช้ระบุตัวตนอีกต่อไป
-- จึงไม่ควรบังคับให้เก็บ (หลักลดข้อมูลเท่าที่จำเป็นตาม PDPA)
-- แต่ยังเก็บได้ถ้างานทะเบียนต้องการกระทบยอดกับระบบทะเบียนอื่น
alter table public.students alter column national_id_hash drop not null;

alter table public.students drop constraint if exists students_national_id_hash_key;
drop index if exists public.students_national_id_hash_key;
create unique index if not exists students_national_id_hash_unique_idx
  on public.students (national_id_hash) where national_id_hash is not null;

comment on column public.students.national_id_hash is
  'ไม่บังคับ — ใช้เฉพาะกรณีต้องกระทบยอดกับระบบทะเบียนอื่น เก็บเป็น HMAC-SHA256 เท่านั้น ไม่เคยเก็บเลขดิบ';

-- import_csv_rows ฉบับล่าสุดอยู่ในไฟล์ 20260828115331_extend_import_csv_rows_for_office_forms.sql
-- ซึ่งแก้ให้ national_id เป็นทางเลือกแล้ว ให้รันไฟล์นั้นซ้ำหลังไฟล์นี้
