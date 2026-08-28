-- ============================================================
-- Seed ข้อมูลจริง หลักสูตรพยาบาลศาสตรบัณฑิต (ปรับปรุง พ.ศ. 2565)
-- วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก
-- ที่มา: (1) สาระสำคัญหลักสูตรพยาบาลศาสตรบัณฑิต ฉบับปรับปรุง พ.ศ. 2565
--        (2) Curriculum mapping 2565 วพบ.กรุงเทพ (พฤษภาคม 2565)
-- idempotent: รันซ้ำได้
-- ============================================================

-- 1) ปรับ constraint ให้รองรับหมวดวิชาเลือกเสรีและรหัสวิชาสำรอง
alter table public.courses add column if not exists course_code_alt text;
comment on column public.courses.course_code_alt is 'รหัสวิชาชุดที่ปรากฏในไฟล์ Curriculum Mapping (0118300xxx) ใช้สำหรับค้นหา/นำเข้าเท่านั้น';
alter table public.courses drop constraint if exists courses_course_type_check;
alter table public.courses add constraint courses_course_type_check check (course_type in ('GE','professional_foundation','professional_theory','professional_practice','free_elective'));
alter table public.courses drop constraint if exists courses_year_level_check;
alter table public.courses add constraint courses_year_level_check check (year_level between 0 and 6);
alter table public.courses drop constraint if exists courses_semester_check;
alter table public.courses add constraint courses_semester_check check (semester between 0 and 3);
comment on column public.courses.year_level is 'ชั้นปีที่กำหนดให้ลงทะเบียน; 0 = ไม่กำหนดชั้นปี (ตามหลักเกณฑ์รหัสวิชา สบช. หลักที่ 8 = 0)';
comment on column public.courses.semester is 'ภาคการศึกษา 1, 2, 3 = ภาคฤดูร้อน; 0 = ไม่กำหนด';

-- ผู้สอนประจำรายวิชา: เพิ่มบทบาทในรายวิชาและภาคการศึกษา
alter table public.course_instructors add column if not exists instructor_role text not null default 'co_instructor';
alter table public.course_instructors add column if not exists term text;
alter table public.course_instructors drop constraint if exists course_instructors_instructor_role_check;
alter table public.course_instructors add constraint course_instructors_instructor_role_check check (instructor_role in ('course_owner','co_instructor','clinical_preceptor'));
comment on column public.course_instructors.instructor_role is 'course_owner = อาจารย์ผู้รับผิดชอบรายวิชา, co_instructor = ผู้สอนร่วม, clinical_preceptor = อาจารย์นิเทศ/พี่เลี้ยงแหล่งฝึก';

do $$
declare v_cur uuid;
begin
  select id into v_cur from public.curricula where version = '2565';
  if v_cur is null then raise exception 'ไม่พบหลักสูตรรุ่น 2565 ในตาราง curricula'; end if;

  -- 2) sub-PLO 24 ข้อ (ที่มา: ตารางที่ 19 เล่มหลักสูตร)
  insert into public.sub_plos (plo_id, code, description, display_order) values
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO1'), '1.1', 'ใช้ความรู้ทางการพยาบาลในการดูแลผู้รับบริการแบบองค์รวมด้วยหัวใจความเป็นมนุษย์ ตามเกณฑ์มาตรฐานและจรรยาบรรณวิชาชีพ', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO1'), '1.2', 'ใช้ความรู้ทางการผดุงครรภ์ในการดูแลผู้รับบริการแบบองค์รวมด้วยหัวใจความเป็นมนุษย์ ตามเกณฑ์มาตรฐานและจรรยาบรรณวิชาชีพ', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO1'), '1.3', 'ใช้ความรู้ศาสตร์พื้นฐานวิชาชีพที่เกี่ยวข้องในการดูแลผู้รับบริการ', 3),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO2'), '2.1', 'ปฏิบัติการพยาบาล โดยใช้กระบวนการพยาบาลแบบองค์รวม ด้วยหัวใจความเป็นมนุษย์ บนหลักฐานเชิงประจักษ์ คำนึงถึงความปลอดภัย การใช้ยาอย่างสมเหตุผล ความหลากหลายทางวัฒนธรรม ภายใต้กฎหมายและจรรยาบรรณวิชาชีพ', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO2'), '2.2', 'ปฏิบัติการผดุงครรภ์ โดยใช้กระบวนการพยาบาลแบบองค์รวมด้วยหัวใจความเป็นมนุษย์ บนหลักฐานเชิงประจักษ์ คำนึงถึงความปลอดภัย การใช้ยาอย่างสมเหตุผล ความหลากหลายทางวัฒนธรรม ภายใต้กฎหมายและจรรยาบรรณวิชาชีพ', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO3'), '3.1', 'แสดงออกถึงพฤติกรรมด้านคุณธรรม ตามอัตลักษณ์คุณธรรมของสถาบันพระบรมราชชนก : มีวินัย หน้าที่ สามัคคี เสียสละ สัจจะ กตเวที', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO4'), '4.1', 'ตัดสินใจแก้ปัญหาโดยใช้ทางเลือกที่หลากหลาย', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO4'), '4.2', 'แสดงความคิดเห็นโดยใช้หลักเหตุผล ไตร่ตรองอย่างรอบด้านบนหลักฐานเชิงประจักษ์', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO4'), '4.3', 'สร้างสรรค์แนวทางการแก้ปัญหาในสถานการณ์ที่หลากหลาย', 3),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO5'), '5.1', 'อธิบายแนวคิด หลักการ กระบวนการวิจัย และสร้างนวัตกรรมทางการพยาบาล', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO5'), '5.2', 'นำผลการวิจัยไปใช้ในการปฏิบัติการพยาบาลและการผดุงครรภ์', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO5'), '5.3', 'ร่วมพัฒนา/ร่วมสร้างวิจัยหรือนวัตกรรมทางการพยาบาล', 3),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO6'), '6.1', 'ประสานความร่วมมือและนำทีมงานให้ทำงานบรรลุเป้าหมาย', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO6'), '6.2', 'กล้าแสดงออกในสิ่งที่ถูกต้องตามสิทธิของตนเองเพื่อให้การทำงานบรรลุเป้าหมาย โดยไม่ละเมิดสิทธิผู้อื่น', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO6'), '6.3', 'บริหารจัดการสุขภาวะชุมชนได้', 3),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO7'), '7.1', 'จับใจความ และถ่ายทอดในชีวิตประจำวัน', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO7'), '7.2', 'จับใจความและถ่ายทอดสาระสำคัญของเนื้อหาวิชาการ', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO7'), '7.3', 'จับใจความและถ่ายทอดสาระสำคัญของเนื้อหาวิชาการ/วิชาชีพและเผยแพร่ต่อสาธารณชน', 3),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO8'), '8.1', 'เลือกสื่อ สารสนเทศและเทคโนโลยีดิจิทัลอย่างมีจริยธรรมเพื่อการเรียนรู้อย่างเท่าทัน', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO8'), '8.2', 'สืบค้นและใช้ข้อมูลสารสนเทศเพื่อการพยาบาลและการผดุงครรภ์ได้สอดคล้องกับสภาพปัญหาของผู้รับบริการ โดยมีการอ้างอิงแหล่งที่มา', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO9'), '9.1', 'วิเคราะห์จุดเด่นจุดด้อยของตนเองได้ เพื่อนำไปสู่การพัฒนาตนเองที่ทันต่อสภาพการณ์ที่เปลี่ยนแปลง', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO9'), '9.2', 'ใช้หลักปรัชญาเศรษฐกิจพอเพียงในการดำเนินชีวิตและการทำงาน', 2),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO10'), '10.1', 'อธิบายแนวคิดการเป็นผู้ประกอบการ', 1),
    ((select id from public.plos where curriculum_id = v_cur and code = 'PLO10'), '10.2', 'ใช้แนวคิดการเป็นผู้ประกอบการด้านสุขภาพในการปฏิบัติงานได้อย่างเหมาะสม', 2)
  on conflict (plo_id, code) do update set description = excluded.description, display_order = excluded.display_order, updated_at = now();

  -- 3) รายวิชา 53 รายวิชา (ที่มา: หมวดที่ 3 ข้อ 3.1.3 และแผนการศึกษา 3.1.4)
  insert into public.courses (curriculum_id, course_code, course_code_alt, name_th, name_en, credits, theory_hours, practice_hours, year_level, semester, course_type, is_active) values
    (v_cur, 'GE 101', null, 'ภาษาไทยเชิงวิชาการ', 'Thai for Academic Purposes', 3, 2, 2, 1, 1, 'GE', true),
    (v_cur, 'GE 102', null, 'ภาษาอังกฤษเพื่อการสื่อสาร', 'English for Communication', 3, 2, 2, 1, 1, 'GE', true),
    (v_cur, 'GE 209', null, 'พลเมืองวิวัฒน์', 'Active Citizens', 3, 2, 2, 1, 1, 'GE', true),
    (v_cur, 'GE 302', null, 'การรู้ดิจิทัล', 'Digital Literacy', 3, 2, 2, 1, 1, 'GE', true),
    (v_cur, 'GE 305', null, 'วิทยาศาสตร์และคณิตศาสตร์ในชีวิตประจำวัน', 'Sciences and Mathematics in Daily Life', 3, 3, 0, 1, 1, 'GE', true),
    (v_cur, 'GE 201', null, 'เราคือ สบช.', 'We are PBRI', 3, 2, 2, 1, 2, 'GE', true),
    (v_cur, 'GE 301', null, 'ผู้ประกอบการในยุคดิจิทัล', 'Entrepreneur in Digital Era', 3, 2, 2, 1, 2, 'GE', true),
    (v_cur, 'GE 103', null, 'ภาษาอังกฤษเชิงวิชาการ', 'English for Academic Purposes', 3, 2, 2, 2, 1, 'GE', true),
    (v_cur, 'GE 104', null, 'ภาษาอังกฤษเพื่อการอ่านและการเขียนเชิงวิชาการ', 'English for Academic Reading and Writing', 3, 2, 2, 2, 2, 'GE', true),
    (v_cur, 'GE 105', null, 'ภาษาอังกฤษก้าวหน้า', 'Advanced English', 3, 2, 2, 4, 1, 'GE', true),
    (v_cur, '0101300102', '0118300102', 'กายวิภาคศาสตร์และสรีรวิทยา', 'Anatomy and Physiology', 3, 2, 2, 1, 1, 'professional_foundation', true),
    (v_cur, '0101300101', '0118300101', 'จุลชีววิทยาและปรสิตวิทยา', 'Microbiology and Parasitology', 2, 2, 0, 1, 2, 'professional_foundation', true),
    (v_cur, '0101300103', '0118300103', 'ชีวเคมีและโภชนศาสตร์', 'Biochemistry and Nutrition', 3, 3, 0, 1, 2, 'professional_foundation', true),
    (v_cur, '0101300104', '0118300104', 'จิตวิทยาพัฒนาการและกระบวนการคิด', 'Developmental Psychology and Thinking Process', 2, 1, 2, 1, 2, 'professional_foundation', true),
    (v_cur, '0101300206', '0118300206', 'พยาธิสรีรวิทยา', 'Pathophysiology', 3, 3, 0, 2, 1, 'professional_foundation', true),
    (v_cur, '0101300205', '0118300205', 'เภสัชวิทยา', 'Pharmacology', 2, 2, 0, 2, 1, 'professional_foundation', true),
    (v_cur, '0101300207', '0118300207', 'กฎหมาย จริยศาสตร์และจรรยาบรรณวิชาชีพการพยาบาล', 'Laws Ethics and Codes in Nursing Profession', 2, 2, 0, 2, 2, 'professional_foundation', true),
    (v_cur, '0101300208', '0118300208', 'มโนมติ ทฤษฎี และกระบวนการพยาบาล', 'Nursing Concepts, Theories and Nursing Process', 2, 1, 2, 2, 1, 'professional_theory', true),
    (v_cur, '0101300209', '0118300209', 'การพยาบาลขั้นพื้นฐาน', 'Fundamentals of Nursing', 3, 2, 2, 2, 1, 'professional_theory', true),
    (v_cur, '0101300210', '0118300210', 'การพยาบาลผู้ใหญ่และผู้สูงอายุ 1', 'Adult and Gerontological Nursing I', 3, 2, 2, 2, 2, 'professional_theory', true),
    (v_cur, '0101300211', '0118300211', 'การพยาบาลผู้สูงอายุ', 'Gerontological Nursing', 2, 1, 2, 2, 2, 'professional_theory', true),
    (v_cur, '0101300212', '0118300212', 'การพยาบาลเด็กและวัยรุ่น', 'Pediatric and Adolescent Nursing', 3, 2, 2, 2, 2, 'professional_theory', true),
    (v_cur, '0101300313', '0118300313', 'การพยาบาลสุขภาพชุมชน', 'Community Health Nursing', 2, 1, 2, 3, 1, 'professional_theory', true),
    (v_cur, '0101300314', '0118300314', 'การพยาบาลผู้ใหญ่และผู้สูงอายุ 2', 'Adult and Gerontological Nursing II', 2, 1, 2, 3, 1, 'professional_theory', true),
    (v_cur, '0101300315', '0118300315', 'วิจัยและนวัตกรรมทางการพยาบาล', 'Nursing Research and Innovation', 3, 1, 4, 3, 1, 'professional_theory', true),
    (v_cur, '0101300316', '0118300316', 'การพยาบาลมารดา ทารก และการผดุงครรภ์ 1', 'Maternal Newborn Nursing and Midwifery I', 3, 2, 2, 3, 1, 'professional_theory', true),
    (v_cur, '0101300317', '0118300317', 'การพยาบาลสุขภาพจิตและจิตเวช', 'Mental Health and Psychiatric Nursing', 3, 2, 2, 3, 1, 'professional_theory', true),
    (v_cur, '0101300418', '0118300418', 'การพยาบาลมารดา ทารก และการผดุงครรภ์ 2', 'Maternal and Newborn Nursing and Midwifery II', 3, 3, 0, 4, 1, 'professional_theory', true),
    (v_cur, '0101300419', '0118300419', 'การพยาบาลและการบริหารจัดการสุขภาวะชุมชน', 'Community Health Nursing and Administration', 2, 1, 2, 4, 1, 'professional_theory', true),
    (v_cur, '0101300420', '0118300420', 'การรักษาโรคเบื้องต้นสำหรับพยาบาล', 'Primary Medical Care for Nurses', 2, 1, 2, 4, 1, 'professional_theory', true),
    (v_cur, '0101300421', '0118300421', 'การบริหารและการจัดการคุณภาพทางการพยาบาล', 'Nursing Administration and Quality Management', 2, 1, 2, 4, 1, 'professional_theory', true),
    (v_cur, '0101300222', '0118300222', 'ปฏิบัติการพยาบาลขั้นพื้นฐาน', 'Fundamentals of Nursing Practicum', 4, 0, 12, 2, 1, 'professional_practice', true),
    (v_cur, '0101300223', '0118300223', 'ปฏิบัติการพยาบาลผู้ใหญ่และผู้สูงอายุ 1', 'Adult and Gerontological Nursing Practicum I', 3, 0, 9, 2, 3, 'professional_practice', true),
    (v_cur, '0101300224', '0118300224', 'ปฏิบัติการพยาบาลเด็กและวัยรุ่น 1', 'Pediatric and Adolescent Nursing Practicum I', 2, 0, 6, 2, 3, 'professional_practice', true),
    (v_cur, '0101300325', '0118300325', 'ปฏิบัติการพยาบาลเด็กและวัยรุ่น 2', 'Pediatric and Adolescent Nursing Practicum II', 2, 0, 6, 3, 2, 'professional_practice', true),
    (v_cur, '0101300326', '0118300326', 'ปฏิบัติการพยาบาลสุขภาพชุมชน', 'Community Health Nursing Practicum', 3, 0, 9, 3, 2, 'professional_practice', true),
    (v_cur, '0101300327', '0118300327', 'ปฏิบัติการพยาบาลผู้ใหญ่และผู้สูงอายุ 2', 'Adult and Gerontological Nursing Practicum II', 3, 0, 9, 3, 2, 'professional_practice', true),
    (v_cur, '0101300330', '0118300330', 'ปฏิบัติการพยาบาลสุขภาพจิตและจิตเวช', 'Mental Health and Psychiatric Nursing Practicum', 3, 0, 9, 3, 2, 'professional_practice', true),
    (v_cur, '0101300329', '0118300329', 'ปฏิบัติการพยาบาลมารดา ทารก และการผดุงครรภ์ 1', 'Maternal and Newborn Nursing and Midwifery Practicum I', 3, 0, 9, 3, 3, 'professional_practice', true),
    (v_cur, '0101300328', '0118300328', 'ปฏิบัติการพยาบาลผู้สูงอายุ', 'Gerontological Nursing Practicum', 2, 0, 6, 3, 3, 'professional_practice', true),
    (v_cur, '0101300431', '0118300431', 'ปฏิบัติการพยาบาลมารดา ทารก และการผดุงครรภ์ 2', 'Maternal and Newborn Nursing and Midwifery Practicum II', 3, 0, 9, 4, 2, 'professional_practice', true),
    (v_cur, '0101300432', '0118300432', 'ปฏิบัติการพยาบาลและการบริหารจัดการสุขภาวะชุมชน', 'Community Health Nursing and Administration Practicum', 3, 0, 9, 4, 2, 'professional_practice', true),
    (v_cur, '0101300433', '0118300433', 'ปฏิบัติการรักษาโรคเบื้องต้นสำหรับพยาบาล', 'Primary Medical Care for Nurses Practicum', 3, 0, 9, 4, 2, 'professional_practice', true),
    (v_cur, '0101300434', '0118300434', 'ปฏิบัติการบริหารและการจัดการคุณภาพทางการพยาบาล', 'Nursing Administration and Quality Management Practicum', 2, 0, 6, 4, 2, 'professional_practice', true),
    (v_cur, '0101300035', '0118300035', 'การพัฒนาบุคลิกภาพและวุฒิภาวะทางอารมณ์', 'Development of Personality and Emotional Quotient', 2, 2, 0, 0, 0, 'free_elective', true),
    (v_cur, '0101300036', '0118300036', 'พืชสมุนไพร', 'Medicinal Plants', 2, 2, 0, 0, 0, 'free_elective', true),
    (v_cur, '0101300037', '0118300037', 'ภูมิปัญญาไทยกับการดูแลสุขภาพ', 'Thai Wisdom and Health Care', 2, 2, 0, 0, 0, 'free_elective', true),
    (v_cur, '0101300038', '0118300038', 'การศึกษาอิสระ', 'Independent Study', 2, 0, 4, 0, 0, 'free_elective', true),
    (v_cur, '0101300039', '0118300039', 'การออกกำลังกายเพื่อสร้างเสริมสุขภาพ', 'Physical Activity for Health Promotion', 2, 1, 2, 0, 0, 'free_elective', true),
    (v_cur, '0101300040', '0118300040', 'ภาษาจีนในชีวิตประจำวัน', 'Chinese for Communication', 2, 1, 2, 0, 0, 'free_elective', true),
    (v_cur, '0101300041', '0118300041', 'ปรัชญาเศรษฐกิจพอเพียงในวิถีชีวิตใหม่', 'Sufficiency Economy Philosophy in New normal', 2, 2, 0, 0, 0, 'free_elective', true),
    (v_cur, '0101300042', '0118300042', 'พลวัตกลุ่มและการทำงานเป็นทีม', 'Group Dynamic and Team Working', 2, 1, 2, 0, 0, 'free_elective', true),
    (v_cur, '0101300043', '0118300043', 'สุนทรียศาสตร์', 'Aesthetics', 2, 2, 0, 0, 0, 'free_elective', true)
  on conflict (curriculum_id, course_code) do update set course_code_alt = excluded.course_code_alt, name_th = excluded.name_th, name_en = excluded.name_en, credits = excluded.credits, theory_hours = excluded.theory_hours, practice_hours = excluded.practice_hours, year_level = excluded.year_level, semester = excluded.semester, course_type = excluded.course_type, is_active = true, updated_at = now();

end $$;
