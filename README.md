# ระบบสารสนเทศเพื่อการประเมินผลลัพธ์การเรียนรู้ระดับหลักสูตร (PLOs)

> **ทุกคำตัดสินมีเส้นทางกลับสู่คะแนนดิบ** — เว็บแอปสำหรับติดตามผลลัพธ์การเรียนรู้รายบุคคล สรุประดับชั้นปี รุ่น และหลักสูตร โดยแสดงหลักฐาน กฎการตัดสิน และร่องรอยการเปลี่ยนแปลงอย่างตรวจสอบได้

โครงการนี้เป็น **React + TypeScript + Vite** ฝั่งผู้ใช้ เชื่อมต่อฐานข้อมูลและการยืนยันตัวตนผ่าน **Supabase** พร้อม workflow สำหรับตรวจสอบและเผยแพร่แบบ static ไปยัง GitHub Pages ออกแบบตามแนวคิด *Clinical Aurora* เพื่อให้ข้อมูลการประเมินที่ซับซ้อนอ่านได้อย่างเป็นระบบบนเดสก์ท็อปและอุปกรณ์เคลื่อนที่

| พื้นที่ | สิ่งที่จัดเตรียมไว้ |
|---|---|
| หน้าจอ | เข้าสู่ระบบ, ภาพรวม PLO, รายบุคคล, ชั้นปี, รุ่น, หลักสูตร และสิทธิ์ผู้ใช้ |
| ฟีเจอร์ใหม่ | ฟอร์มบันทึกคะแนนพร้อมอัปโหลดหลักฐาน, กราฟผลสัมฤทธิ์รายชั้นปี, Export PDF/Excel |
| กติกาผลสัมฤทธิ์ | ประเมินเฉพาะ M/P, เกณฑ์ 3.51, รอผลเมื่อคะแนนไม่ครบ, ใช้ผลซ่อมเสริมล่าสุด และผ่านทุก sub-PLO |
| ข้อมูล | Schema, RLS, audit log, storage หลักฐานส่วนตัว และ migration ที่ทำซ้ำได้ |
| ความปลอดภัย | Google OAuth 2.0, บทบาทผู้ใช้, least privilege, hash เลขบัตรประชาชน และ RLS |
| การเผยแพร่ | GitHub Actions ตรวจ type/test/build แล้ว deploy ไปยัง GitHub Pages |

## การเข้าใช้งาน

| โหมด | URL / ขั้นตอน |
|---|---|
| **ใช้งานจริง (Production)** | [job-bcnb-p.github.io/PLOs/](https://job-bcnb-p.github.io/PLOs/) |
| **โหมดตัวอย่าง (Demo)** | ต่อท้าย URL ด้วย `?demo=1&view=overview` หรือกดปุ่มโหมดตัวอย่างหน้า Login |
| **ฟอร์มบันทึกผล (Preview)** | ต่อท้าย URL ด้วย `?demo=1&view=student&entry=1` |

## เริ่มต้นอย่างรวดเร็ว

ติดตั้ง Node.js 22 และ pnpm 10 จากนั้นกรอกค่า Supabase ใน `.env.local` และเริ่มระบบตามคำสั่งต่อไปนี้:

```bash
git clone https://github.com/JOB-BCNB-P/PLOs.git
cd PLOs
cp .env.example .env.local
pnpm install
pnpm dev
```

การใช้งานจริงต้องนำ migration ใน `supabase/migrations/` ไปใช้กับโครงการ Supabase ของหน่วยงาน และตั้งค่า Google OAuth ตามคู่มือ รายละเอียดทั้งหมดอยู่ในเอกสารต่อไปนี้:

| เอกสาร | วัตถุประสงค์ |
|---|---|
| [Solution blueprint](docs/01_solution_blueprint.md) | ขอบเขตระบบ, ERD และการแม็ปมาตรฐาน |
| [คู่มือติดตั้งและเผยแพร่](docs/02_installation_deployment_guide.md) | ขั้นตอนตั้งแต่เครื่องนักพัฒนาถึง GitHub Pages |
| [คู่มือปฏิบัติการและความปลอดภัย](docs/03_operations_security_guide.md) | บทบาท, ข้อมูลส่วนบุคคล, audit และการใช้งานจริง |
| [พจนานุกรมข้อมูล](docs/04_data_dictionary.md) | ความหมายของตารางและความสัมพันธ์สำคัญ |
| [แผนตรวจรับ](docs/05_acceptance_test.md) | กรณีทดสอบกฎ M/P, remediation, สิทธิ์ และ responsive |
| [คู่มือตั้งค่า Auth & Google OAuth](docs/07_supabase_auth_google_oauth_guide.md) | ขั้นตอนการเชื่อมต่อ Google Workspace และตั้งค่า Redirect |

## คำสั่งคุณภาพ

```bash
pnpm check  # ตรวจสอบ TypeScript และรัน 12 Unit Tests
pnpm build  # สร้างไฟล์ static สำหรับ GitHub Pages
```

---
พัฒนาโดย **Manus AI** สำหรับวิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ

## ฟีเจอร์ข้อมูลจริงและการใช้งานล่าสุด

Dashboard รองรับการค้นหานักศึกษาตามรหัสหรือชื่อ โดยค้นจากตาราง `students` ใน Supabase และจำกัดผลลัพธ์ 20 รายการเพื่อให้ตอบสนองเร็ว ผู้ใช้ที่เลือกจากผลค้นหาจะถูกนำไปยัง Student View พร้อมประวัติหลักฐานของนักศึกษารายนั้น

Student View รองรับการดู metadata หลักฐาน เปิดไฟล์ผ่าน signed URL อายุสั้น ดาวน์โหลด และลบไฟล์ตาม storage policy และ RLS ของผู้ใช้ การบันทึกคะแนนตรวจ session, สิทธิ์, duplicate attempt และบันทึก metadata ด้วย RPC ที่ใช้ transaction เดียวเมื่อมีไฟล์

ไฟล์ `docs/source_analysis/curriculum_mapping_import.csv` เป็นข้อมูล mapping ที่แปลงจากเอกสารจริง จำนวน 198 records จาก 49 รายวิชา ครอบคลุม PLO1–PLO10 และระดับ I/R/M แต่ยังไม่ถูก import เข้า Supabase จนกว่าจะยืนยัน sub-PLO descriptions, semester และ course_type จากเอกสารหลักสูตรอย่างเป็นทางการ รายละเอียดอยู่ใน `docs/08_source_data_analysis_report.md`

โหมด `?demo=1` ใช้สำหรับดูรูปแบบหน้าจอเท่านั้น การค้นหา, บันทึกคะแนน และประวัติหลักฐานแบบ production ต้องใช้งานผ่าน session ที่ผ่าน Supabase Authentication และ policy ที่เหมาะสม
