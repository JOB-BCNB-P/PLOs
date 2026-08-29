-- ขยาย import_csv_rows ให้รองรับฟอร์ม CSV ของงานทะเบียนและงานบุคลากร
--  * students          : รับ curriculum_version (เช่น 2565) แทน UUID, รับ national_id 13 หลักแล้วแฮชฝั่งฐานข้อมูล, รองรับ section
--  * staff             : รองรับ position_th และ department
--  * course_instructors: รองรับ instructor_role และ term และค้นรายวิชาด้วย course_code_alt ได้
--  * class_advisors    : รองรับ advisor_kind
--  * courses/mapping   : ค้นหลักสูตรด้วย curriculum_version และค้นรายวิชาด้วยรหัสสำรองได้
create or replace function public.import_csv_rows(p_kind text, p_rows jsonb, p_source_name text default null::text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item jsonb;
  v_email text;
  v_profile_id uuid;
  v_student_id uuid;
  v_course_id uuid;
  v_curriculum_id uuid;
  v_plo_id uuid;
  v_sub_plo_id uuid;
  v_assessment_method_id uuid;
  v_count integer := 0;
  v_role public.app_role;
  v_hash text;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนนำเข้าข้อมูล';
  end if;
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'::public.app_role
  ) then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่นำเข้า CSV ได้';
  end if;
  if p_kind not in ('curricula','plos','sub_plos','courses','curriculum_mapping','scores','mapping_staging','students','staff','user_roles','student_access','class_advisor_assignments','course_instructors','course_enrollments') then
    raise exception 'ไม่รองรับประเภทข้อมูล CSV นี้';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'ไม่พบข้อมูลสำหรับนำเข้า';
  end if;
  if jsonb_array_length(p_rows) > 1000 then
    raise exception 'นำเข้าได้ไม่เกิน 1,000 แถวต่อครั้ง';
  end if;

  for v_item in select value from jsonb_array_elements(p_rows)
  loop
    if p_kind = 'curricula' then
      if coalesce(v_item->>'code','') = '' or coalesce(v_item->>'name_th','') = '' then raise exception 'หลักสูตรต้องมี code และ name_th'; end if;
      insert into public.curricula (version, name_th, status, effective_year, description, created_by)
      values (v_item->>'code', v_item->>'name_th', coalesce(nullif(v_item->>'status',''),'draft')::public.curriculum_status, (v_item->>'effective_year')::integer, nullif(v_item->>'description',''), auth.uid())
      on conflict (version) do update set name_th = excluded.name_th, status = excluded.status, effective_year = excluded.effective_year, description = excluded.description, updated_at = now();

    elsif p_kind = 'plos' then
      select c.id into v_curriculum_id from public.curricula c where c.id = (v_item->>'curriculum_id')::uuid limit 1;
      if v_curriculum_id is null then raise exception 'ไม่พบ curriculum_id %', v_item->>'curriculum_id'; end if;
      insert into public.plos (curriculum_id, code, description, category, display_order, is_active)
      values (v_curriculum_id, v_item->>'code', v_item->>'description', coalesce(nullif(v_item->>'category',''),'professional'), (v_item->>'display_order')::smallint, coalesce((v_item->>'is_active')::boolean, true))
      on conflict (curriculum_id, code) do update set description = excluded.description, category = excluded.category, display_order = excluded.display_order, is_active = excluded.is_active, updated_at = now();

    elsif p_kind = 'sub_plos' then
      select p.id into v_plo_id from public.plos p join public.curricula c on c.id = p.curriculum_id where c.version = v_item->>'curriculum_code' and p.code = v_item->>'plo_code' limit 1;
      if v_plo_id is null then raise exception 'ไม่พบ PLO % ในหลักสูตร %', v_item->>'plo_code', v_item->>'curriculum_code'; end if;
      insert into public.sub_plos (plo_id, code, description, display_order)
      values (v_plo_id, v_item->>'code', v_item->>'description', (v_item->>'display_order')::smallint)
      on conflict (plo_id, code) do update set description = excluded.description, display_order = excluded.display_order, updated_at = now();

    elsif p_kind = 'courses' then
      v_curriculum_id := null;
      if nullif(v_item->>'curriculum_id','') is not null then
        select c.id into v_curriculum_id from public.curricula c where c.id = (v_item->>'curriculum_id')::uuid limit 1;
      elsif nullif(v_item->>'curriculum_version','') is not null then
        select c.id into v_curriculum_id from public.curricula c where c.version = v_item->>'curriculum_version' limit 1;
      end if;
      if v_curriculum_id is null then raise exception 'ไม่พบหลักสูตรสำหรับรายวิชา % (ระบุ curriculum_version หรือ curriculum_id)', v_item->>'course_code'; end if;
      insert into public.courses (curriculum_id, course_code, course_code_alt, name_th, name_en, credits, theory_hours, practice_hours, year_level, semester, course_type, is_active)
      values (v_curriculum_id, v_item->>'course_code', nullif(v_item->>'course_code_alt',''), v_item->>'name_th', nullif(v_item->>'name_en',''), (v_item->>'credits')::numeric, coalesce(nullif(v_item->>'theory_hours','')::numeric, 0), coalesce(nullif(v_item->>'practice_hours','')::numeric, 0), (v_item->>'year_level')::smallint, (v_item->>'semester')::smallint, v_item->>'course_type', coalesce((v_item->>'is_active')::boolean, true))
      on conflict (curriculum_id, course_code) do update set course_code_alt = excluded.course_code_alt, name_th = excluded.name_th, name_en = excluded.name_en, credits = excluded.credits, theory_hours = excluded.theory_hours, practice_hours = excluded.practice_hours, year_level = excluded.year_level, semester = excluded.semester, course_type = excluded.course_type, is_active = excluded.is_active, updated_at = now();

    elsif p_kind = 'curriculum_mapping' then
      select c.id into v_curriculum_id from public.curricula c where c.version = v_item->>'curriculum_code' limit 1;
      v_code := v_item->>'course_code';
      select co.id into v_course_id from public.courses co where co.curriculum_id = v_curriculum_id and (co.course_code = v_code or co.course_code_alt = v_code) limit 1;
      select p.id into v_plo_id from public.plos p where p.curriculum_id = v_curriculum_id and p.code = v_item->>'plo_code' limit 1;
      if v_curriculum_id is null or v_course_id is null or v_plo_id is null then raise exception 'ไม่พบหลักสูตร/รายวิชา/PLO สำหรับ mapping แถวนี้ (%)', v_code; end if;
      v_sub_plo_id := null;
      if nullif(v_item->>'sub_plo_code','') is not null then
        select sp.id into v_sub_plo_id from public.sub_plos sp where sp.plo_id = v_plo_id and sp.code = v_item->>'sub_plo_code' limit 1;
        if v_sub_plo_id is null then raise exception 'ไม่พบ sub-PLO %', v_item->>'sub_plo_code'; end if;
      end if;
      insert into public.curriculum_map (course_id, plo_id, sub_plo_id, level)
      values (v_course_id, case when v_sub_plo_id is null then v_plo_id else null end, v_sub_plo_id, (v_item->>'level')::public.mapping_level)
      on conflict (course_id, plo_id, sub_plo_id) do update set level = excluded.level;

    elsif p_kind = 'scores' then
      select s.id into v_student_id from public.students s where s.student_code = v_item->>'student_code' limit 1;
      v_assessment_method_id := (v_item->>'assessment_method_id')::uuid;
      if v_student_id is null then raise exception 'ไม่พบ student_code %', v_item->>'student_code'; end if;
      insert into public.scores (student_id, assessment_method_id, raw_score, competency_level, term, attempt_no, note, recorded_by)
      values (v_student_id, v_assessment_method_id, (v_item->>'raw_score')::numeric, (v_item->>'competency_level')::numeric, v_item->>'term', (v_item->>'attempt_no')::smallint, nullif(v_item->>'note',''), auth.uid())
      on conflict (student_id, assessment_method_id, term, attempt_no) do update set raw_score = excluded.raw_score, competency_level = excluded.competency_level, note = excluded.note, recorded_by = auth.uid(), recorded_at = now();

    elsif p_kind = 'mapping_staging' then
      if coalesce(v_item->>'curriculum_version','') = '' or coalesce(v_item->>'course_code','') = '' or coalesce(v_item->>'plo_code','') = '' or coalesce(v_item->>'sub_plo_code','') = '' then
        raise exception 'Curriculum Mapping ต้องมี curriculum_version, course_code, plo_code และ sub_plo_code';
      end if;
      if v_item->>'mapping_level' not in ('I','R','M','P') then
        raise exception 'mapping_level ต้องเป็น I, R, M หรือ P';
      end if;
      insert into public.curriculum_mapping_staging
        (curriculum_version, year_level_text, course_code, course_name_th, credits_text, plo_code, sub_plo_code, mapping_level, source_filename, imported_by)
      values
        (v_item->>'curriculum_version', v_item->>'year_level_text', v_item->>'course_code', v_item->>'course_name_th', nullif(v_item->>'credits_text',''), v_item->>'plo_code', v_item->>'sub_plo_code', v_item->>'mapping_level', coalesce(nullif(v_item->>'source_filename',''), p_source_name, 'CSV import'), auth.uid())
      on conflict (curriculum_version, course_code, plo_code, sub_plo_code, mapping_level) do update set
        year_level_text = excluded.year_level_text, course_name_th = excluded.course_name_th, credits_text = excluded.credits_text,
        source_filename = excluded.source_filename, imported_by = auth.uid(), imported_at = now();

    elsif p_kind = 'students' then
      -- หลักสูตร: รับได้ทั้ง curriculum_version (เช่น 2565) และ curriculum_id (UUID)
      v_curriculum_id := null;
      if nullif(v_item->>'curriculum_id','') is not null then
        select c.id into v_curriculum_id from public.curricula c where c.id = (v_item->>'curriculum_id')::uuid limit 1;
      elsif nullif(v_item->>'curriculum_version','') is not null then
        select c.id into v_curriculum_id from public.curricula c where c.version = v_item->>'curriculum_version' limit 1;
      end if;
      if v_curriculum_id is null then
        raise exception 'ไม่พบหลักสูตรสำหรับนักศึกษา % — ระบุ curriculum_version (เช่น 2565) หรือ curriculum_id', v_item->>'student_code';
      end if;

      -- เลขบัตรประชาชน: กรอกเลข 13 หลักในคอลัมน์ national_id ได้ ระบบจะแปลงเป็น HMAC-SHA256 และไม่บันทึกค่าดิบ
      v_hash := lower(nullif(v_item->>'national_id_hash',''));
      if v_hash is null and nullif(v_item->>'national_id','') is not null then
        v_hash := public.hash_national_id(v_item->>'national_id');
      end if;
      if v_hash is null or v_hash !~ '^[a-f0-9]{64}$' then
        raise exception 'นักศึกษา % ต้องมี national_id (13 หลัก) หรือ national_id_hash (64 ตัวอักษร)', v_item->>'student_code';
      end if;

      insert into public.students
        (student_code, full_name_th, national_id_hash, admit_year, current_year_level, curriculum_id, section, email, is_active)
      values
        (v_item->>'student_code', v_item->>'full_name_th', v_hash, (v_item->>'admit_year')::integer, (v_item->>'current_year_level')::smallint, v_curriculum_id, nullif(v_item->>'section',''), lower(nullif(trim(v_item->>'email'),'')), coalesce((v_item->>'is_active')::boolean, true))
      on conflict (student_code) do update set
        full_name_th = excluded.full_name_th, national_id_hash = excluded.national_id_hash,
        admit_year = excluded.admit_year, current_year_level = excluded.current_year_level,
        curriculum_id = excluded.curriculum_id, section = coalesce(excluded.section, public.students.section),
        email = coalesce(excluded.email, public.students.email),
        is_active = excluded.is_active, updated_at = now();

      -- ถ้านักศึกษามีบัญชีที่ล็อกอินไว้แล้ว ผูก student_access ให้ทันที
      if nullif(trim(v_item->>'email'),'') is not null then
        select p.id into v_profile_id from public.profiles p where lower(p.email) = lower(trim(v_item->>'email')) limit 1;
        if v_profile_id is not null then
          select s.id into v_student_id from public.students s where s.student_code = v_item->>'student_code' limit 1;
          insert into public.student_access (student_id, user_id, verified_at, verified_by)
          values (v_student_id, v_profile_id, now(), auth.uid())
          on conflict (student_id) do update set user_id = excluded.user_id, verified_at = now(), verified_by = auth.uid();
        end if;
      end if;

    elsif p_kind = 'student_access' then
      v_email := lower(trim(v_item->>'email'));
      select p.id into v_profile_id from public.profiles p where lower(p.email) = v_email limit 1;
      select s.id into v_student_id from public.students s where s.student_code = v_item->>'student_code' limit 1;
      if v_profile_id is null then raise exception 'ยังไม่พบบัญชี Google ใน Supabase Auth สำหรับ %', v_email; end if;
      if v_student_id is null then raise exception 'ไม่พบ student_code %', v_item->>'student_code'; end if;
      insert into public.student_access (student_id, user_id, verified_at, verified_by)
      values (v_student_id, v_profile_id, coalesce(nullif(v_item->>'verified_at','')::timestamptz, now()), auth.uid())
      on conflict (student_id) do update set user_id = excluded.user_id, verified_at = now(), verified_by = auth.uid();

    elsif p_kind = 'class_advisor_assignments' then
      v_email := lower(trim(v_item->>'advisor_email'));
      select p.id into v_profile_id from public.profiles p where lower(p.email) = v_email limit 1;
      select s.id into v_student_id from public.students s where s.student_code = v_item->>'student_code' limit 1;
      if v_profile_id is null then raise exception 'ยังไม่พบบัญชีอาจารย์ที่ปรึกษาใน Supabase Auth สำหรับ %', v_email; end if;
      if v_student_id is null then raise exception 'ไม่พบ student_code %', v_item->>'student_code'; end if;
      if coalesce(nullif(v_item->>'advisor_kind',''),'class_advisor') not in ('class_advisor','co_advisor') then
        raise exception 'advisor_kind ต้องเป็น class_advisor หรือ co_advisor';
      end if;
      insert into public.class_advisor_assignments (advisor_user_id, student_id, academic_year, advisor_kind)
      values (v_profile_id, v_student_id, (v_item->>'academic_year')::integer, coalesce(nullif(v_item->>'advisor_kind',''),'class_advisor'))
      on conflict (advisor_user_id, student_id, academic_year) do update set advisor_kind = excluded.advisor_kind;

    elsif p_kind = 'course_instructors' then
      v_email := lower(trim(coalesce(nullif(v_item->>'instructor_email',''), v_item->>'user_email')));
      v_code := v_item->>'course_code';
      select p.id into v_profile_id from public.profiles p where lower(p.email) = v_email limit 1;
      select c.id into v_course_id from public.courses c where c.course_code = v_code or c.course_code_alt = v_code limit 1;
      if v_profile_id is null then raise exception 'ยังไม่พบบัญชีผู้สอนใน Supabase Auth สำหรับ %', v_email; end if;
      if v_course_id is null then raise exception 'ไม่พบ course_code %', v_code; end if;
      if coalesce(nullif(v_item->>'instructor_role',''),'co_instructor') not in ('course_owner','co_instructor','clinical_preceptor') then
        raise exception 'instructor_role ต้องเป็น course_owner, co_instructor หรือ clinical_preceptor';
      end if;
      insert into public.course_instructors (course_id, user_id, academic_year, instructor_role, term)
      values (v_course_id, v_profile_id, (v_item->>'academic_year')::integer, coalesce(nullif(v_item->>'instructor_role',''),'co_instructor'), nullif(v_item->>'term',''))
      on conflict (course_id, user_id, academic_year) do update set instructor_role = excluded.instructor_role, term = coalesce(excluded.term, public.course_instructors.term);

    elsif p_kind = 'course_enrollments' then
      v_code := v_item->>'course_code';
      select c.id into v_course_id from public.courses c where c.course_code = v_code or c.course_code_alt = v_code limit 1;
      select s.id into v_student_id from public.students s where s.student_code = v_item->>'student_code' limit 1;
      if v_course_id is null then raise exception 'ไม่พบ course_code %', v_code; end if;
      if v_student_id is null then raise exception 'ไม่พบ student_code %', v_item->>'student_code'; end if;
      insert into public.course_enrollments (course_id, student_id, term)
      values (v_course_id, v_student_id, v_item->>'term')
      on conflict (course_id, student_id, term) do nothing;

    elsif p_kind in ('staff','user_roles') then
      v_email := lower(trim(v_item->>'email'));
      if v_email !~ '^[^[:space:]@]+@bcn\.ac\.th$' then
        raise exception 'ผู้ใช้ต้องเป็นบัญชีอีเมล @bcn.ac.th';
      end if;
      select p.id into v_profile_id from public.profiles p where lower(p.email) = v_email limit 1;
      if v_item->>'role' not in ('admin','executive','academic_affairs','program_chair','class_advisor','lecturer','student') then
        raise exception 'role ไม่อยู่ในรายการที่ระบบรองรับ';
      end if;
      if v_profile_id is null then
        -- ยังไม่เคยเข้าสู่ระบบ: เก็บเป็นรายชื่อล่วงหน้า ระบบจะให้สิทธิ์อัตโนมัติเมื่อล็อกอินครั้งแรก
        insert into public.pending_staff (email, display_name, position_th, department, role, can_edit, invited_by)
        values (v_email, nullif(trim(v_item->>'display_name'),''), nullif(trim(v_item->>'position_th'),''), nullif(trim(v_item->>'department'),''),
                (v_item->>'role')::public.app_role, coalesce((v_item->>'can_edit')::boolean, false), auth.uid())
        on conflict (email) do update set
          display_name = coalesce(excluded.display_name, public.pending_staff.display_name),
          position_th  = coalesce(excluded.position_th, public.pending_staff.position_th),
          department   = coalesce(excluded.department, public.pending_staff.department),
          role = excluded.role, can_edit = excluded.can_edit,
          invited_by = auth.uid(), invited_at = now(), applied_at = null, applied_user_id = null;
        v_count := v_count + 1;
        continue;
      end if;
      v_role := (v_item->>'role')::public.app_role;
      update public.profiles
      set display_name = coalesce(nullif(trim(v_item->>'display_name'),''), display_name),
          position_th  = coalesce(nullif(trim(v_item->>'position_th'),''), position_th),
          department   = coalesce(nullif(trim(v_item->>'department'),''), department),
          can_edit     = coalesce((v_item->>'can_edit')::boolean, can_edit),
          is_active    = coalesce((v_item->>'is_active')::boolean, is_active),
          updated_at   = now()
      where id = v_profile_id;
      insert into public.user_roles (user_id, role, assigned_by)
      values (v_profile_id, v_role, auth.uid())
      on conflict (user_id) do update set role = excluded.role, assigned_by = auth.uid(), assigned_at = now();
    end if;
    v_count := v_count + 1;
  end loop;

  insert into public.audit_log (actor_user_id, action, target_table, record_id, new_data, reason)
  values (auth.uid(), 'CSV_IMPORT',
    case p_kind
      when 'curricula' then 'curricula' when 'plos' then 'plos' when 'sub_plos' then 'sub_plos'
      when 'courses' then 'courses' when 'curriculum_mapping' then 'curriculum_map' when 'scores' then 'scores'
      when 'mapping_staging' then 'curriculum_mapping_staging' when 'students' then 'students'
      when 'student_access' then 'student_access' when 'class_advisor_assignments' then 'class_advisor_assignments'
      when 'course_instructors' then 'course_instructors' when 'course_enrollments' then 'course_enrollments'
      else 'profiles,user_roles' end,
    p_source_name, jsonb_build_object('import_kind', p_kind, 'row_count', v_count), 'Controlled CSV import RPC');
  return v_count;
end;
$function$;
