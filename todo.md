# งานที่ต้องดำเนินการ

- [x] ตรวจสอบหน้าปัจจุบันและเส้นทางข้อมูล Supabase ที่เกี่ยวข้องกับ `scores`, `assessment_methods` และ `evidence`
- [x] เพิ่มฟอร์มบันทึกคะแนนพร้อม validation ของคะแนนดิบ ระดับสมรรถนะ ภาคเรียน และ attempt
- [x] เพิ่มการอัปโหลดไฟล์หลักฐานไปยัง private bucket พร้อมตรวจชนิดไฟล์ ขนาดไฟล์ และยกเลิกไฟล์ค้างเมื่อบันทึกไม่สำเร็จ
- [x] เชื่อมการบันทึกคะแนนกับ RPC/ตาราง Supabase และแสดงผลลัพธ์หรือข้อผิดพลาดอย่างชัดเจน
- [x] เพิ่มกราฟผลสัมฤทธิ์ PLOs แยกตามชั้นปี โดยไม่ใช้ข้อมูลจำลองเมื่อเชื่อมต่อฐานข้อมูลจริง
- [x] เพิ่ม Export รายงานผลการประเมินเป็น PDF และ Excel พร้อมหัวรายงานและข้อมูลที่ตรวจสอบย้อนกลับได้
- [x] ทดสอบ type check, unit tests, build, validation, responsive และสถานะ Supabase/RLS
- [x] อัปเดตคู่มือติดตั้ง/ใช้งาน เพิ่ม checkpoint และส่งมอบผลลัพธ์

## เงื่อนไขรับมอบ

- [x] ไม่สามารถบันทึกข้อมูลที่ไม่ผ่าน validation ได้
- [x] ไฟล์หลักฐานไม่เกิน 20 MB และจำกัด MIME type ตาม policy
- [x] กราฟแยกชั้นปีอ่านง่ายบน desktop และ mobile
- [x] ไฟล์ PDF/Excel เปิดใช้งานได้และมีข้อมูลตรงกับหน้าจอ
- [x] ไม่มี secret หรือ service role key ใน frontend

## งานแก้ไขจากการตรวจรับรอบที่สอง

- [x] ปรับ flow คะแนนและหลักฐานให้สื่อสาร partial success อย่างชัดเจนและทำความสะอาดไฟล์/ข้อมูลเมื่อขั้นตอนถัดไปล้มเหลว
- [x] เปลี่ยนกราฟให้แสดง empty/error state จากข้อมูลจริงแทน demo fallback เมื่อเชื่อม Supabase แล้ว
- [x] ปรับ PDF ให้รองรับข้อความไทยและเพิ่ม reason/source evidence สำหรับ traceability
- [x] เพิ่มการทดสอบ report export และบันทึกผลการตรวจ Supabase/RLS ที่ทำได้โดยไม่ใช้ข้อมูลบุคคลจริง
- [x] บันทึก checkpoint ใหม่หลังแก้ไขรอบนี้

## งานปิดช่องว่างก่อนส่งมอบ

- [x] เพิ่มการทดสอบ PDF export ให้ตรวจการสร้างเอกสารและ callback save ได้
- [x] บันทึก checkpoint ใหม่หลังสถานะโค้ดและเอกสารล่าสุดผ่านการตรวจทั้งหมด

## งานเพิ่มเติม: Authentication, Supabase integration และสไลด์ผู้บริหาร

- [x] ตรวจสอบโครงสร้าง Auth, callback, env และเส้นทาง form ปัจจุบัน
- [x] จัดทำคู่มือตั้งค่า Supabase Authentication และ Google OAuth แบบทีละขั้นตอนพร้อมแหล่งอ้างอิงทางการ
- [x] ปรับฟอร์มบันทึกคะแนนให้ตรวจ session, สิทธิ์, schema และ RPC จริง พร้อม error/loading/duplicate handling
- [x] เพิ่ม/ปรับ unit tests สำหรับ Supabase integration และ validation ของฟอร์ม
- [x] เขียนเนื้อหาสไลด์สรุป workflow, บทบาทผู้ใช้, dashboard, evidence, reports และ rollout
- [x] สร้างสไลด์สำหรับนำเสนอผู้บริหารและตรวจสอบการแสดงผล
- [x] อัปเดต README/คู่มือและบันทึก checkpoint ใหม่

## งานแก้ไขจากการตรวจรับรอบที่สาม

- [x] เพิ่มการจัดการ duplicate submission/duplicate attempt ใน ScoreEntryForm พร้อมข้อความ error เฉพาะกรณี
- [x] เพิ่ม tests ของ ScoreEntryForm ครอบคลุม session missing, permission denied, RPC failure, upload cleanup, และ duplicate handling
- [x] อัปเดต README ให้รวมวิธีเข้าใช้งาน Auth/OAuth และเส้นทาง Dashboard ล่าสุด
- [x] บันทึก checkpoint ใหม่หลังเอกสาร โค้ด และสไลด์รอบนี้เสร็จสมบูรณ์

## งานเพิ่มเติม: ข้อมูลจริง การค้นหา UX และประวัติหลักฐาน

- [x] สำรวจไฟล์เอกสารแนบทั้งหมดและจัดทำ data mapping ก่อนนำเข้าฐานข้อมูล
- [x] ตรวจสอบความครบถ้วน ความซ้ำ และข้อมูลส่วนบุคคลก่อน import ข้อมูลจริง
- [x] เพิ่มช่องค้นหานักศึกษาตามรหัสหรือชื่อ พร้อมกรองผลบน Dashboard และรองรับข้อมูลจริง
- [x] เพิ่ม loading animation และ toast notification ครอบคลุม loading, success, error และ duplicate
- [x] เพิ่มประวัติหลักฐานสำหรับดู metadata, ดาวน์โหลดแบบ signed URL และลบตามสิทธิ์ RLS
- [x] ทดสอบ end-to-end ที่จำเป็นและตรวจ readiness สำหรับ production deployment
- [x] อัปเดตคู่มือและบันทึก checkpoint สำหรับเวอร์ชันพร้อมใช้งานจริง

## ข้อจำกัดข้อมูลจริงที่ต้องยืนยันกับผู้ดูแลหลักสูตร

- [ ] ยืนยันคำอธิบาย sub-PLO ของหลักสูตร 2565 จากเอกสารทางการก่อน import 198 mapping records
- [ ] ยืนยัน semester และ course_type ของ 49 รายวิชาก่อน import courses
- [ ] จัดเตรียม roster นักศึกษาและคะแนนจริงที่ผ่านการลด/ปกป้องข้อมูลส่วนบุคคล
- [ ] สร้าง live student verdict loader เพื่อแทนข้อมูล PLO ตัวอย่างใน StudentView เมื่อมี production roster/achievement
- [ ] sync โค้ด feature ล่าสุดไปยัง GitHub Pages หลัง checkpoint ใหม่

## งานค้างก่อนประกาศ Production Ready เต็มรูปแบบ

- [ ] ทดสอบ end-to-end ด้วยบัญชีจริงใน Supabase/Google OAuth ครอบคลุม login, search นักศึกษา, save score + upload evidence, signed download และ delete ภายใต้ RLS พร้อมบันทึกผล
- [ ] สร้าง checkpoint ใหม่หลังฟีเจอร์ค้นหา ประวัติหลักฐาน และการวิเคราะห์ข้อมูลจริงเสร็จ แล้ว sync/push ไป GitHub Pages พร้อมยืนยัน deployment
- [ ] ยืนยัน sub-PLO, semester, course_type และเตรียม roster/คะแนนจริงก่อนประกาศว่า production ready เต็มรูปแบบ
