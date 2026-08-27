# พจนานุกรมข้อมูลฉบับย่อ

ฐานข้อมูลแยก **โครงสร้างหลักสูตร**, **ข้อมูลผู้ใช้และผู้เรียน**, **การวัดผล**, **ธรรมาภิบาล** และ **หลักฐาน** เพื่อป้องกันการทำให้ตารางใดตารางหนึ่งรับภาระหลายความหมายเกินไป ความสัมพันธ์หลักเริ่มจาก `curricula → plos → sub_plos` และ `courses → clos → assessment_methods`; คะแนนของนักศึกษาจะถูกแปลงเป็น `sub_plo_achievement` และ `plo_achievement`

| กลุ่ม | ตาราง | วัตถุประสงค์ |
|---|---|---|
| ผู้ใช้ | `profiles`, `user_roles` | โปรไฟล์ Supabase Auth และบทบาทระบบ |
| หลักสูตร | `curricula`, `plos`, `sub_plos`, `ylos`, `ylo_plo_map` | เวอร์ชันหลักสูตรและผลลัพธ์การเรียนรู้ |
| รายวิชา | `courses`, `clos`, `clo_plo_map`, `curriculum_map` | Constructive alignment และระดับ I/R/M/P |
| แผนวัดผล | `assessment_methods` | เครื่องมือ, rubric, weight, threshold และ workload |
| ผู้เรียน | `students`, `student_access`, `class_advisor_assignments`, `course_enrollments` | ตัวตนผู้เรียนและขอบเขตการเห็นข้อมูล |
| ผลวัดและ verdict | `scores`, `sub_plo_achievement`, `plo_achievement` | คะแนนดิบ ผลระดับย่อย และคำตัดสิน PLO |
| ธรรมาภิบาล | `verification`, `cqi_actions`, `settings`, `standard_mapping`, `audit_log` | การรับรองผล, ปรับปรุง, กฎ และร่องรอยการกระทำ |
| หลักฐาน | `evidence` และ Storage bucket `plo-evidence` | metadata และไฟล์ supporting evidence |

## ฟิลด์สำคัญของคำตัดสิน

| ตาราง/ฟิลด์ | ความหมาย | ใช้ในรายงานย้อนหลัง |
|---|---|---|
| `scores.competency_level` | ระดับสมรรถนะ 0 ถึง 5 | เป็นต้นทางของการคำนวณ |
| `scores.remediation_of` | เชื่อมคะแนนซ่อมเสริมกับคะแนนเดิม | ใช้ผลล่าสุดตามกฎ approved |
| `plo_achievement.status` | `achieved`, `not_achieved`, `pending` | ห้ามนำ Pending ไปนับเป็นผ่านหรือไม่ผ่าน |
| `plo_achievement.source_score_ids` | รายการ UUID ของคะแนนต้นทาง | drill-down กลับสู่คะแนนและหลักฐาน |
| `plo_achievement.rule_snapshot` | กฎ ณ เวลาตัดสิน | ยืนยันผลแม้ setting เปลี่ยนภายหลัง |
| `audit_log` | actor, action, target, old/new data, reason, time | ตรวจ who/what/when/why |

ไฟล์ ERD แบบ D2 อยู่ที่ [`01_erd.d2`](01_erd.d2) และ solution blueprint ให้คำอธิบาย mapping ระหว่างตารางกับความต้องการระบบอย่างละเอียด
