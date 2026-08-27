# แผนตรวจรับระบบ PLOs

แผนตรวจรับนี้เป็นเกณฑ์ขั้นต่ำก่อนนำข้อมูลจริงเข้าระบบ ผู้ตรวจควรทดสอบใน Supabase project ที่ใช้ publishable key จริงและบัญชีผู้ใช้ที่กำหนด role/assignment แล้ว ไม่ควรทดสอบด้วย service role เพราะจะไม่สะท้อน RLS ที่ผู้ใช้จริงพบ

| รหัส | สถานการณ์ | ผลที่คาดหวัง |
|---|---|---|
| AT-01 | บันทึกคะแนนระดับ I/R เท่านั้น | PLO เป็น `pending`; I/R ไม่ถูกใช้ในตัวตัดสิน |
| AT-02 | คะแนน M/P ครบและค่าเฉลี่ยถ่วงน้ำหนัก 3.51 | sub-PLO/PLO เป็น `achieved` ตามกฎที่ตั้งไว้ |
| AT-03 | PLO มี sub-PLO หนึ่งข้อได้ 3.50 | PLO เป็น `not_achieved` เมื่อใช้กฎผ่านทุก sub-PLO |
| AT-04 | จุดวัด M/P ที่ required ยังไม่มีคะแนน | สถานะเป็น `pending` ไม่ใช่ `not_achieved` |
| AT-05 | เพิ่มคะแนน remediation attempt ใหม่ | ระบบใช้คะแนนล่าสุดและอัปเดต verdict พร้อม source IDs |
| AT-06 | นักศึกษาลงชื่อเข้าใช้ | เห็นเฉพาะ student record ที่ผูกใน `student_access` |
| AT-07 | อาจารย์ไม่มี course assignment | ไม่สามารถบันทึกคะแนนรายวิชาที่ไม่เกี่ยวข้อง |
| AT-08 | ผู้ดูแลปิด `can_edit` ของอาจารย์ | คำขอบันทึกข้อมูลถูก RLS/RPC ปฏิเสธ |
| AT-09 | อัปโหลด PDF 21 MB | ถูกปฏิเสธโดย bucket limit 20 MB |
| AT-10 | เปิดแอปที่กว้าง 375 px | rail ซ่อน, navigation เปิดได้, การ์ด/ตารางไม่ล้นหน้าจอ |
| AT-11 | `pnpm check` และ Vitest | ผ่าน type check และ 4 achievement-engine unit tests |
| AT-12 | push เข้า `main` | GitHub Action ตรวจสำเร็จและ Pages แสดงหน้าแอปได้ |

> การเปลี่ยน pass level, decision levels หรือ aggregation rule ต้องทำใน `settings` ของ curriculum ที่ถูกต้อง และยืนยันว่า verdict ที่คำนวณใหม่บันทึก `rule_snapshot` ใหม่ทุกครั้ง
