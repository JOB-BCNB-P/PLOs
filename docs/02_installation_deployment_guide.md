# คู่มือติดตั้งและเผยแพร่ระบบประเมิน PLOs

**ผู้จัดทำ: Manus AI**  
**เวอร์ชัน: 1.0**  
**สำหรับ: ระบบสารสนเทศเพื่อการประเมินผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLOs)**

> คู่มือนี้ใช้สำหรับผู้ดูแลระบบและนักพัฒนาในการติดตั้งแบบทำซ้ำได้ โดยแยกข้อมูลลับออกจาก source code และใช้ Row Level Security ควบคุมสิทธิ์ที่ชั้นฐานข้อมูล

## 1. ภาพรวมการติดตั้ง

ระบบเป็น static React application ที่ติดต่อ Supabase จากเบราว์เซอร์ผ่าน publishable key โดย Supabase Auth จะส่ง JWT ของผู้ใช้พร้อมคำขอและ RLS เป็นผู้ตัดสินว่าผู้ใช้นั้นอ่านหรือแก้ไขแถวข้อมูลใดได้ [1] [2] GitHub Pages ให้บริการเฉพาะไฟล์ static ส่วนฐานข้อมูล การยืนยันตัวตน และไฟล์หลักฐานยังอยู่ใน Supabase จึงไม่ต้องเปิดเซิร์ฟเวอร์ Node.js ใน GitHub Pages

| องค์ประกอบ | บริการ | ผู้รับผิดชอบ | สิ่งที่ต้องกำหนด |
|---|---|---|---|
| Web application | GitHub Pages | ผู้ดูแล repository | workflow และ repository variables |
| Authentication | Supabase Auth + Google | ผู้ดูแล Supabase/Google Workspace | OAuth Client ID และ Client Secret |
| Database | Supabase Postgres | ผู้ดูแลฐานข้อมูล | migrations, RLS และ role แรก |
| Evidence files | Supabase Storage | ผู้ดูแลฐานข้อมูล | private bucket `plo-evidence` และ policies |
| Source control | GitHub | ทีมพัฒนา | `main` branch และ pull request policy |

## 2. ข้อกำหนดเบื้องต้น

เครื่องนักพัฒนาต้องมี **Git**, **Node.js 22 LTS** และ **pnpm 10** รวมถึงสิทธิ์เข้าถึง Supabase project กับ GitHub repository ผู้ติดตั้งฐานข้อมูลควรเป็นผู้ได้รับอนุญาตให้รัน migration และผู้กำหนด Google OAuth ต้องเข้าถึง Google Cloud Console ของโดเมนสถาบัน

| ซอฟต์แวร์/บัญชี | วิธีตรวจสอบ | เหตุผล |
|---|---|---|
| Node.js 22 | `node --version` | ใช้สร้างและรัน Vite/React |
| pnpm 10 | `pnpm --version` | ติดตั้ง dependency แบบ lockfile |
| Git | `git --version` | รับ source และส่งการเปลี่ยนแปลง |
| Supabase account | เข้าสู่ระบบ dashboard ได้ | ใช้ฐานข้อมูล, Auth และ Storage |
| GitHub account | เข้าถึง `JOB-BCNB-P/PLOs` ได้ | ใช้ CI/CD และ Pages |

## 3. รับ source และตั้งค่าเครื่องนักพัฒนา

ให้ clone repository และสร้างไฟล์ `.env.local` จากตัวอย่าง ไฟล์ `.env.local` ถูกละเว้นจาก Git จึงไม่ควรวางค่าจริงใน `README`, source code หรือ commit ใด ๆ

```bash
git clone https://github.com/JOB-BCNB-P/PLOs.git
cd PLOs
cp .env.example .env.local
pnpm install --frozen-lockfile
```

แก้ไข `.env.local` โดยใส่ URL และ publishable key ของ Supabase project ที่หน้า **Connect** ของ Supabase dashboard คีย์ publishable ถูกออกแบบให้ใช้ฝั่งเบราว์เซอร์ได้เมื่อมี RLS แต่ **ห้าม** ใส่ `service_role` key ในไฟล์ `VITE_*` หรือหน้าเว็บ เพราะ service key ข้าม RLS ได้ทั้งหมด [2] [3]

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
```

เมื่อกรอกค่าแล้ว เริ่ม development server ที่ `http://localhost:3000` ด้วยคำสั่งต่อไปนี้

```bash
pnpm dev
```

## 4. สร้างและเตรียม Supabase project

ให้สร้าง Supabase project ใหม่ใน organization ของสถาบัน เลือกรหัสผ่านฐานข้อมูลที่รัดกุม เก็บไว้ใน password manager และบันทึก **Project Ref** สำหรับคำสั่ง CLI ขั้นถัดไป จากนั้นติดตั้ง Supabase CLI ตามคู่มือทางการของ Supabase หรือใช้ SQL Editor ใน dashboard หากหน่วยงานไม่อนุญาตให้ติดตั้ง CLI

### 4.1 ใช้ migrations ที่จัดเตรียมไว้

โครงการมี migration 3 ชุดใน `supabase/migrations/` โดยต้องเรียงตามชื่อไฟล์ ห้ามสลับลำดับ เพราะชุดแรกสร้าง enum, ตาราง, RLS, trigger, ฟังก์ชันคำนวณ และข้อมูลหลักสูตรตัวอย่าง; ชุดที่สองสร้าง private evidence bucket; ชุดที่สามกำหนด search path ที่ปลอดภัยให้ trigger function

| Migration | เนื้อหา |
|---|---|
| `202608270001_initial_plo_schema.sql` | โครงสร้าง PLO/CLO/รายวิชา, คะแนน, verdict, role, audit, RLS และกฎคำนวณ |
| `202608270002_evidence_storage.sql` | bucket `plo-evidence` แบบ private และ Storage RLS policy |
| `202608270003_harden_trigger_function.sql` | hardening ของ `set_updated_at()` |

วิธีที่แนะนำคือเชื่อม Supabase CLI กับ project แล้วสั่ง `db push` จาก root ของ repository

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

หากต้องใช้ SQL Editor ให้เปิดไฟล์ migration ตามลำดับ คัดลอกทั้งไฟล์ลงใน SQL Editor แล้วเลือก **Run** ทีละไฟล์ ควรบันทึกผลการรันและรหัส migration ไว้ในบันทึกเปลี่ยนแปลงของหน่วยงาน ไม่ควรนำไฟล์ migration เดิมไปรันซ้ำใน environment ที่ทำเครื่องหมายว่า apply แล้ว

### 4.2 ตรวจสอบโครงสร้างหลัง migration

เข้า **Table Editor** เพื่อตรวจว่ามีตารางอย่างน้อย `profiles`, `user_roles`, `curricula`, `plos`, `courses`, `students`, `scores`, `plo_achievement`, `evidence`, `settings` และ `audit_log` จากนั้นเปิด **Storage** เพื่อตรวจว่า bucket `plo-evidence` เป็น private การอัปโหลด Storage จะไม่อนุญาตโดยปริยายหากไม่มี RLS policy และ policy ที่ให้มากับโครงการจำกัดผู้ใช้ที่ผ่านการยืนยันตัวตน [3]

## 5. ตั้งค่า Google Workspace / Google OAuth

Supabase Auth รองรับการเข้าสู่ระบบด้วย Google และเมื่อ SDK ส่งคำขอฐานข้อมูล จะใช้ token ของผู้ใช้ร่วมกับ RLS ในการจำกัดแถวที่เข้าถึงได้ [1] ขั้นตอนต่อไปนี้ต้องทำโดยผู้ดูแล Google Cloud และผู้ดูแล Supabase ร่วมกัน

1. สร้างหรือเลือก OAuth client แบบ **Web application** ใน Google Cloud Console ของสถาบัน
2. เพิ่ม Authorized redirect URI เป็น `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. กำหนด OAuth consent screen ให้เหมาะสมกับนโยบายองค์กร และถ้าต้องจำกัดผู้ใช้ ให้กำหนดโดเมน `@bcn.ac.th` ในการตั้งค่า Google/นโยบายแอป
4. ที่ Supabase Dashboard เปิด **Authentication → Providers → Google**, เปิดใช้ provider แล้วกรอก Client ID กับ Client Secret
5. ที่ **Authentication → URL Configuration** เพิ่ม URL สำหรับ local และ production ดังนี้

```text
http://localhost:3000/**
https://job-bcnb-p.github.io/PLOs/**
```

6. ทดสอบด้วยบัญชีบุคลากรที่ได้รับอนุญาตหนึ่งบัญชี หลังจากเข้าสู่ระบบครั้งแรก trigger `handle_new_user` จะสร้าง profile และกำหนด role เริ่มต้นเป็น `student` โดยอัตโนมัติ

## 6. กำหนดผู้ดูแลระบบคนแรก

เนื่องจากทุกบัญชีใหม่เริ่มเป็น `student` จึงต้องให้ผู้ดูแลฐานข้อมูลกำหนด admin คนแรกผ่าน SQL Editor หลังจากบุคคลนั้นลงชื่อเข้าใช้ Google สำเร็จแล้ว ให้แทนค่าอีเมลจริงในคำสั่งด้านล่าง และตรวจสอบรายชื่อก่อนรันเสมอ

```sql
begin;

update public.profiles
set can_edit = true
where email = 'admin@bcn.ac.th';

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from public.profiles
where email = 'admin@bcn.ac.th'
on conflict (user_id) do update set role = excluded.role;

commit;
```

หลังจากนี้ admin ควรใช้หน้าจอสิทธิ์ของระบบเพื่อให้สิทธิ์แก้ไขแบบจำเป็นเท่านั้น แต่การแต่งตั้ง role ผู้ใช้ใหม่ในช่วงต้นอาจทำด้วย SQL Editor ได้ โดยต้องมีบันทึกเหตุผลตามนโยบายหน่วยงาน

## 7. นำเข้าข้อมูลหลักสูตรและนักศึกษา

ก่อนกรอกคะแนน ให้สร้าง PLO/sub-PLO, รายวิชา, CLO, assessment methods และ mapping I/R/M/P ให้ครบตามเวอร์ชันหลักสูตร การตัดสินของรุ่นนี้จะใช้เฉพาะ mapping ระดับ **M/P**, เกณฑ์ competence level `3.51`, รอผลเมื่อจุดวัด M/P ไม่ครบ, ใช้คะแนนล่าสุดหลังการซ่อมเสริม และต้องผ่าน sub-PLO ทุกข้อจึงผ่าน PLO

เลขบัตรประชาชนต้องไม่เก็บเป็น plaintext ในฐานข้อมูล ให้แปลงเป็น SHA-256 ก่อน insert ตัวอย่างต่อไปนี้แสดงเฉพาะรูปแบบการคำนวณ ไม่ควรวางเลขบัตรจริงใน shell history, เอกสาร, issue หรือ commit

```sql
select encode(digest('IDENTITY_VALUE_FROM_SECURE_IMPORT', 'sha256'), 'hex') as national_id_hash;
```

สำหรับข้อมูลจำนวนมาก ให้ผู้ดูแลสร้างกระบวนการ import ภายในที่มีสิทธิ์เหมาะสม ตรวจความถูกต้องของรหัสนักศึกษาและหลักสูตรก่อนนำเข้า และเก็บไฟล์นำเข้าในพื้นที่จำกัดสิทธิ์ ห้ามใช้ service key ในเบราว์เซอร์ แม้จะสะดวกต่อการ import เพราะคีย์ดังกล่าวข้าม RLS [3]

## 8. ตรวจคุณภาพบนเครื่อง

ก่อนส่ง code ขึ้น `main` ให้รันทั้ง type check, unit test และ production build ตามลำดับดังนี้ ผลที่ผ่านคาดหวังคือ `tsc --noEmit` สำเร็จ, achievement engine ผ่าน 4 กรณี และ Vite สร้าง `dist/public` สำเร็จ

```bash
pnpm check
pnpm exec vitest run client/src/lib/achievement-engine.test.ts
pnpm build
```

## 9. ตั้งค่า GitHub Pages

Vite ต้องตั้ง `base` ให้ตรงกับ subpath ของ repository เมื่อเผยแพร่ที่ `https://<owner>.github.io/<repo>/` ซึ่งในโครงการนี้ตั้งค่า `/PLOs/` เฉพาะตอน GitHub Actions ทำงานแล้ว [4] Workflow `.github/workflows/deploy-pages.yml` ติดตั้ง dependencies, ตรวจ type, รัน unit test, build และส่ง `dist/public` ไป GitHub Pages ทุกครั้งที่มีการ push เข้า `main`

ให้เพิ่ม Repository Variables ที่ **GitHub repository → Settings → Secrets and variables → Actions → Variables** ดังนี้ ค่า publishable key สามารถเป็น variable ได้ แต่หากนโยบายหน่วยงานต้องการเก็บเป็น secret ให้เปลี่ยน `vars.` เป็น `secrets.` ใน workflow ให้สอดคล้องกัน

| Variable | ค่า |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ค่า publishable key ของ project |

จากนั้นไปที่ **Settings → Pages** เลือก Source เป็น **GitHub Actions** แล้ว push commit เข้า `main` GitHub Actions จะสร้าง artifact และ deploy เมื่อ workflow สำเร็จ Vite แนะนำ GitHub Actions สำหรับ Pages เนื่องจากต้องมีขั้นตอน build ก่อนเผยแพร่ [4]

```bash
git add .
git commit -m "feat: initialize PLO assessment system"
git push origin main
```

ผลการเผยแพร่จะตรวจได้ที่แท็บ **Actions** และ URL ปกติของ repository นี้คือ `https://job-bcnb-p.github.io/PLOs/` เมื่อ workflow สำเร็จ โปรดทดสอบ Google login หลัง URL ถูกเพิ่มใน Supabase URL Configuration แล้ว

## 10. ขั้นตอนหลังเผยแพร่และการแก้ปัญหา

| อาการ | จุดตรวจ | วิธีดำเนินการ |
|---|---|---|
| เข้าสู่ระบบ Google แล้วกลับเข้าแอปไม่ได้ | Google redirect URI และ Supabase URL Configuration | ตรวจ Project Ref และเพิ่ม Pages URL ที่ถูกต้อง |
| หน้า Pages สีขาวหรือ asset หาไม่พบ | workflow build และ `base` ของ Vite | ตรวจว่า build รันภายใต้ GitHub Actions และ Pages source เป็น GitHub Actions |
| Query ได้ข้อมูลว่าง | role, `student_access`, `course_instructors`, RLS | ตรวจว่าบัญชีผ่าน login และได้รับ role/assignment ที่ตรงกับข้อมูล |
| อัปโหลดหลักฐานไม่ได้ | bucket `plo-evidence`, `can_edit`, MIME type | ตรวจสิทธิ์แก้ไข, ขนาดไฟล์ไม่เกิน 20 MB และชนิดไฟล์ที่อนุญาต |
| คะแนนบันทึกได้แต่ PLO เป็น Pending | mapping M/P, assessment methods, คะแนน | ตรวจว่ามี mapping M/P และผลครบทุกจุดวัดที่ required |

## 11. เอกสารอ้างอิง

[1] [Supabase Auth](https://supabase.com/docs/guides/auth)  
[2] [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)  
[3] [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)  
[4] [Vite: Deploying a Static Site](https://vite.dev/guide/static-deploy)

## 12. การใช้งานฟอร์มคะแนน หลักฐาน และรายงาน

ผู้มีสิทธิ์แก้ไขเปิดหน้ารายบุคคลแล้วกด **บันทึกคะแนน** ระบบจะโหลดรายชื่อนักศึกษาและ assessment methods ตามขอบเขต RLS จาก Supabase ผู้ใช้ต้องเลือกนักศึกษา จุดวัดผล คะแนนดิบ ระดับสมรรถนะ ภาคเรียน และครั้งที่ประเมิน จากนั้นแนบหลักฐานได้เป็น PDF, JPG, PNG, DOCX หรือ XLSX ไม่เกิน 20 MB ซึ่งสอดคล้องกับ private bucket และ Storage policy ของโครงการ [3]

ก่อนเรียก `record_score` ระบบตรวจว่า student/method ถูกเลือก, คะแนนดิบไม่ติดลบ, competency อยู่ในช่วง 0–5, ภาคเรียนอยู่ในรูปแบบ `พ.ศ./ภาค` และ attempt เป็นจำนวนเต็มตั้งแต่ 1 หาก validation ไม่ผ่าน ระบบจะแสดงข้อผิดพลาดโดยไม่ส่งคำขอไปยังฐานข้อมูล หากอัปโหลดไฟล์สำเร็จแต่สร้าง metadata ไม่สำเร็จ ระบบจะลบไฟล์ค้างจาก bucket เพื่อไม่ให้เกิด orphan evidence

บน Dashboard และ StudentView มีปุ่ม **PDF** และ **Excel** รายงาน Excel เก็บแถวผล PLO พร้อม student code, ชั้นปี, ค่า computed value, status, term และเหตุผล ส่วน PDF เป็นรายงานสรุปสำหรับพิมพ์หรือส่งต่อ โดยข้อมูลที่แสดงใน preview ซึ่งมีป้าย `DEMO VIEW` เป็นข้อมูลสาธิตและต้องเปลี่ยนเป็นข้อมูลจริงภายใต้ session ที่ผ่าน RLS ก่อนใช้งานในหน่วยงาน

กราฟ **ผลสัมฤทธิ์ PLO แยกตามชั้นปี** จะพยายามอ่าน `students` และ `plo_achievement` ของภาคเรียนปัจจุบันจาก Supabase ถ้าผู้ใช้ไม่มีข้อมูลตาม RLS หรือยังไม่มีข้อมูลผลประเมิน ระบบจะแสดง fallback สำหรับ preview พร้อมป้ายกำกับชัดเจน ไม่ควรนำ fallback ไปอ้างเป็นสถิติทางการ

[3] [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)


## 10. ใช้งานค้นหานักศึกษาและประวัติหลักฐาน

บน Dashboard ผู้ใช้ที่ผ่าน session สามารถพิมพ์รหัสนักศึกษาหรือชื่อในช่อง **ค้นหานักศึกษา** ระบบจะค้นจาก `students.student_code` และ `students.full_name_th` ด้วย `ilike` จำกัดผลลัพธ์ 20 รายการ และตัด wildcard ที่อาจทำให้ filter ทำงานผิดปกติ เลือกผลลัพธ์เพื่อเปิด Student View ของระเบียนนั้นได้ทันที โหมด `?demo=1` ใช้ดูตัวอย่างเท่านั้นและไม่ค้นข้อมูลจริง

ใน Student View ส่วน **ประวัติไฟล์หลักฐาน** จะโหลด metadata จาก `evidence` ที่เชื่อมกับคะแนนของนักศึกษา การเปิดและดาวน์โหลดใช้ signed URL จาก private bucket อายุ 120 วินาที การลบจะตรวจ storage policy และ RLS ของเจ้าของไฟล์หรือผู้ใช้ที่มีสิทธิ์กำกับดูแล หาก storage ลบสำเร็จแต่ metadata ล้มเหลว ให้ตรวจรายการและ audit/log ก่อนดำเนินการซ้ำ

แบบฟอร์มคะแนนแสดง loading animation ระหว่างโหลดข้อมูลอ้างอิง และ toast สำหรับเริ่มตรวจสอบ, บันทึกสำเร็จ, duplicate attempt, permission denied และ error การกดบันทึกซ้ำถูกป้องกันขณะ request เดิมทำงาน

## 11. ขอบเขตข้อมูลจริงจากเอกสารแนบ

ไฟล์ `docs/source_analysis/curriculum_mapping_import.csv` เป็น staged import artifact จาก Curriculum Mapping จริง จำนวน 198 records จาก 49 รายวิชา ครอบคลุม PLO1–PLO10 และ I/R/M รายละเอียดอยู่ใน `docs/08_source_data_analysis_report.md` ปัจจุบันยังไม่ import เข้า Supabase เนื่องจากฐานข้อมูลยังไม่มี sub-PLO ของหลักสูตร 2565 และไฟล์แนบยังไม่มี roster นักศึกษา/คะแนนจริง การเติมข้อมูลต้องยืนยัน sub-PLO descriptions, semester และ course_type ก่อนเสมอ
