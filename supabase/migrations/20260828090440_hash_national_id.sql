-- แปลงเลขบัตรประชาชน 13 หลักเป็น HMAC-SHA256 (hex 64 ตัว) โดยไม่บันทึกค่าดิบไว้ที่ใด
create or replace function public.hash_national_id(p_national_id text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare v_digits text; v_pepper bytea;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนใช้งานฟังก์ชันนี้';
  end if;
  if not public.user_has_any_role(array['admin','academic_affairs','program_chair','executive']::public.app_role[]) then
    raise exception 'เฉพาะผู้ดูแลระบบ/งานทะเบียนวิชาการเท่านั้นที่เรียกใช้ฟังก์ชันนี้ได้';
  end if;
  v_digits := regexp_replace(coalesce(p_national_id, ''), '[^0-9]', '', 'g');
  if length(v_digits) <> 13 then
    raise exception 'เลขประจำตัวประชาชนต้องมี 13 หลัก';
  end if;
  select value into v_pepper from public.app_secrets where key = 'national_id_pepper';
  if v_pepper is null then raise exception 'ยังไม่ได้ตั้งค่า national_id_pepper ใน app_secrets'; end if;
  return encode(hmac(v_digits, v_pepper, 'sha256'), 'hex');
end $$;

revoke all on function public.hash_national_id(text) from public, anon;
grant execute on function public.hash_national_id(text) to authenticated;

comment on function public.hash_national_id(text) is
  'คืนค่า HMAC-SHA256 ของเลขบัตรประชาชนด้วย pepper ที่เก็บใน app_secrets เพื่อกัน brute-force จากพื้นที่เลข 13 หลัก; ไม่บันทึกค่าดิบ และเรียกได้เฉพาะบุคลากรที่มีสิทธิ์';
