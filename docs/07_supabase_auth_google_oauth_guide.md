# คู่มือตั้งค่า Supabase Authentication และ Google OAuth

เอกสารนี้ใช้กับโครงการ PLOs ที่เชื่อมกับ Supabase project ref `ootfwcssrgzpliadjlau` และเว็บ production บน GitHub Pages. ขั้นตอนอ้างอิงจากเอกสาร Supabase ทางการ [1] [2] [3] และควรทำใน Google Cloud project ของหน่วยงานที่ผู้ดูแลมีสิทธิ์แก้ OAuth credentials.

## 1. ตรวจสอบค่าโครงการและเตรียม URL

เปิด Supabase Dashboard แล้วเลือก project ที่มี URL `https://ootfwcssrgzpliadjlau.supabase.co`. ไปที่ **Project Settings → API** เพื่อยืนยัน Project URL และ publishable key. คีย์ที่ใช้ใน browser ต้องเป็น publishable/anon key เท่านั้น และต้องไม่ใช้ `service_role` ใน frontend เพราะ service role ข้าม RLS ได้ [3]

กำหนด URL ในตารางต่อไปนี้ให้ครบถ้วน โดย production ต้องใช้ path ของ GitHub Pages รวม `/PLOs/` ขณะที่ Google Cloud Authorized JavaScript origins ไม่ใส่ path.

| รายการ | ค่า |
|---|---|
| Production site URL | `https://job-bcnb-p.github.io/PLOs/` |
| Production origin สำหรับ Google | `https://job-bcnb-p.github.io` |
| Supabase Auth callback สำหรับ Google | `https://ootfwcssrgzpliadjlau.supabase.co/auth/v1/callback` |
| Local app URL | `http://localhost:3000/` หรือ URL ที่ development server แสดงจริง |
| Local origin สำหรับ Google | `http://localhost:3000` |

## 2. ตั้งค่า Google Auth Platform

ไปที่ [Google Cloud Console](https://console.cloud.google.com/), เลือกหรือสร้าง project ของหน่วยงาน แล้วเปิด **Google Auth Platform**. ในส่วน **Branding** กำหนด application name, logo, support email และลิงก์ privacy policy/terms ตามนโยบายของหน่วยงาน. ในส่วน **Data Access** ให้ใช้ scope เท่าที่จำเป็น ได้แก่ `openid`, `https://www.googleapis.com/auth/userinfo.email` และ `https://www.googleapis.com/auth/userinfo.profile`; ไม่ควรเพิ่ม scope ของ Google API ที่ระบบ PLOs ไม่ได้ใช้ [1]

ในส่วน **Clients** เลือก **Create Client → Web application**. กรอกค่าดังนี้ แล้วกด Create:

| ช่อง Google | ค่า |
|---|---|
| Authorized JavaScript origins | `https://job-bcnb-p.github.io` และ `http://localhost:3000` ระหว่างพัฒนา |
| Authorized redirect URIs | `https://ootfwcssrgzpliadjlau.supabase.co/auth/v1/callback` |

เก็บ Client ID และ Client Secret ใน password manager ของหน่วยงาน ห้าม commit ลง GitHub. หาก Google Workspace จำกัดเฉพาะผู้ใช้ในองค์กร ให้ตั้ง Publishing status และ User type ให้ตรงกับนโยบาย Workspace; หากแอปอยู่ใน Testing ให้เพิ่มบัญชีผู้ทดสอบใน Test users.

## 3. เปิด Google provider ใน Supabase

ไปที่ **Supabase Dashboard → Authentication → Providers → Google**. เปิด provider แล้ววาง Client ID และ Client Secret จาก Google Auth Platform จากนั้นกด Save. หากใช้ client IDs หลายประเภท ให้ใช้ Web client ID เป็นรายการแรกตามแนวทาง Supabase [1]

## 4. ตั้งค่า Site URL และ Redirect URLs

ไปที่ **Authentication → URL Configuration**. ตั้ง **Site URL** เป็น `https://job-bcnb-p.github.io/PLOs/` และเพิ่ม Redirect URLs แบบ exact ดังนี้:

```text
https://job-bcnb-p.github.io/PLOs/
http://localhost:3000/
```

อย่าเพิ่ม wildcard กว้างเกินไปใน production. Supabase จะยอมรับ `redirectTo` จาก client เฉพาะ URL ที่อยู่ใน allow-list และ Site URL เป็น fallback เมื่อไม่ได้ระบุ `redirectTo` [2]

## 5. ตั้งค่า environment สำหรับ build

สร้าง `.env.local` ในเครื่องโดยไม่ commit:

```env
VITE_SUPABASE_URL=https://ootfwcssrgzpliadjlau.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_วางค่าจริงจาก Supabase
```

ใน GitHub repository ตั้งค่า **Settings → Secrets and variables → Actions → Variables** เป็น `VITE_SUPABASE_URL` และ `VITE_SUPABASE_PUBLISHABLE_KEY` แล้วให้ workflow ส่งค่าเข้า build หากใช้ fallback ที่ฝัง publishable key อยู่ใน source ให้เปลี่ยนเป็น environment-only ก่อน production. ไม่ต้องสร้าง `service_role` เป็น GitHub Actions variable สำหรับ frontend.

## 6. ทดสอบการเข้าสู่ระบบ

เปิด `https://job-bcnb-p.github.io/PLOs/` แล้วเลือก **บุคลากร → เข้าสู่ระบบด้วย Google Workspace**. Google ต้อง redirect กลับมายัง `/PLOs/`; หลัง callback แอปจะเรียก `getSession()` และพาเข้าสู่ workspace เมื่อมี session. ตรวจสอบใน Supabase **Authentication → Users** ว่ามีผู้ใช้ใหม่ และตรวจ browser Application/Local Storage ว่ามี session ของ Supabase โดยไม่เปิดเผย token ใน screenshot หรือ issue tracker.

ทดสอบกรณีปฏิเสธ consent, บัญชีนอกโดเมน และ sign out. บัญชีที่ไม่ใช่ `@bcn.ac.th` ไม่ควรได้รับสิทธิ์ข้อมูลเพียงเพราะ login สำเร็จ ต้องกำหนด role/assignment ในตารางระบบและบังคับด้วย RLS ด้วย.

## 7. ตรวจสิทธิ์ก่อนใช้ฟอร์มคะแนน

หลัง login ให้เปิด Dashboard → นักศึกษา → **บันทึกคะแนนและหลักฐาน**. ฟอร์มจะโหลดนักศึกษาและ assessment methods ตาม policy, เรียก `can_record_assessment` ก่อนบันทึก, ตรวจค่าคะแนนและไฟล์, upload ไป private bucket แล้วเรียก `record_score_with_evidence` เพื่อ commit metadata คะแนนและหลักฐานใน transaction เดียว. ถ้า RPC ล้มเหลว ระบบลบ object ที่เพิ่ง upload และแจ้งข้อผิดพลาด.

ตรวจสอบอย่างน้อยสองบทบาท: lecturer ที่ได้รับ assignment ต้องบันทึกได้เฉพาะจุดวัดผลของตนเอง และบัญชีที่ไม่มี assignment ต้องถูกปฏิเสธ. ห้ามใช้ข้อมูลนักศึกษาจริงในบัญชีทดสอบที่แชร์ร่วมกัน.

## 8. Troubleshooting

หาก browser แสดง `ERR_CONNECTION_REFUSED` ที่ `localhost` หลังเลือกบัญชี Google ให้รัน `pnpm dev` ในโครงการก่อน และเปิด URL ที่ development server แสดง (โดยปกติ `http://localhost:3000/`); ถ้าใช้ OAuth บนเครื่อง local ให้เพิ่ม `http://localhost:3000/` ใน Supabase Authentication → URL Configuration ด้วย. หากพบ `Unsupported provider: provider is not enabled` หรือ `validation_failed` ให้ตรวจที่ **Supabase Dashboard → Authentication → Providers → Google** ว่าสวิตช์ Google เปิดอยู่จริง มี Web Client ID/Client Secret ครบ และกด Save แล้ว จากนั้นตรวจว่า Google OAuth consent screen/Google Auth Platform ของ project เดียวกันยังเปิดใช้งานอยู่. หากพบ `redirect_uri_mismatch` ให้ตรวจว่า Google Client ใช้ callback ของ Supabase ไม่ใช่ GitHub Pages URL. หากพบ `not a valid redirect URL` ให้ตรวจ URL Configuration ของ Supabase และ trailing slash ให้ตรงกับ `redirectTo`. หาก login สำเร็จแต่ยังเห็นหน้า Login ให้ตรวจ Site URL, callback path `/PLOs/`, browser storage และ `onAuthStateChange`.

หากฟอร์มขึ้นว่าโหลดรายการไม่ได้ ให้ตรวจ session, Data API exposure, table grants และ RLS policies. หากขึ้นว่าไม่มีสิทธิ์บันทึก ให้ตรวจ role/assignment ของ `auth.uid()` ไม่ควรแก้ด้วยการเปิด table ให้ `anon`.

## References

[1] [Supabase: Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)  
[2] [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)  
[3] [Supabase: JavaScript signInWithOAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)

## ทางเข้าเดียวสำหรับทุกบทบาท (ปรับปรุง 28 ส.ค. 2569)

หน้า Login ยังมีปุ่มเลือกประเภทผู้ใช้ **บุคลากร/อาจารย์** กับ **นักศึกษา** เพื่อบอกขั้นตอนให้ตรงกลุ่ม
แต่ทั้งสองปุ่มนำไปสู่การเข้าสู่ระบบด้วยอีเมลผ่าน Google เหมือนกัน ต่างกันเพียงข้อความแนะนำ
และแท็บบุคลากรส่ง `hd=bcn.ac.th` เป็นตัวช่วยกรองบัญชีในหน้าเลือกของ Google เท่านั้น

**การเลือกแท็บไม่ให้สิทธิ์ใด ๆ** สิทธิ์จริงมาจากรายชื่อที่ลงทะเบียนไว้ในฐานข้อมูลเสมอ นักศึกษาที่กดแท็บบุคลากร
ก็ยังได้ role `student` ตามเดิม

ช่องกรอกเลขบัตรประชาชนถูกถอดออกจากหน้าจอทั้งหมด เลขบัตรจึงไม่ถูกพิมพ์เข้าเบราว์เซอร์อีกเลย
เหลือเส้นทางเดียวคือคอลัมน์ `national_id` ในไฟล์ CSV ที่งานทะเบียนนำเข้า ซึ่งแปลงเป็น HMAC-SHA256 ที่ฝั่งฐานข้อมูล

สิทธิ์ไม่ได้มาจากหน้าจอที่ผู้ใช้เลือก แต่มาจากข้อมูลที่ลงทะเบียนไว้ล่วงหน้า

| ผู้ใช้ | สิ่งที่ต้องลงทะเบียนไว้ก่อน | ผลหลังล็อกอินครั้งแรก |
|---|---|---|
| อาจารย์/บุคลากร | `staff.csv` (อีเมล `@bcn.ac.th` + role) | trigger `handle_new_user` อ่านจาก `pending_staff` แล้วให้ role, ตำแหน่ง, ภาควิชา และ `can_edit` |
| นักศึกษา | คอลัมน์ `email` ใน `students.csv` | จับคู่กับ `students.email` แล้วสร้าง `student_access` ให้อัตโนมัติ |
| ผู้ที่ไม่มีในระบบ | — | ได้ role `student` โดยไม่มี `student_access` จึงไม่เห็นข้อมูลของใครเลย |

หน้าจอถูกกรองตามบทบาทด้วย (`viewsForRole` ใน `AppShell`)

- **นักศึกษา** เห็นเฉพาะเมนู *รายคน* (ผลของตนเอง) และ *หลักสูตร* ไม่มีปุ่มบันทึกคะแนน ไม่มีช่องค้นหานักศึกษา และไม่เห็นเมนูผู้ดูแล
- **อาจารย์ ที่ปรึกษา ประธานหลักสูตร งานวิชาการ ผู้บริหาร** เห็นทุกเมนูยกเว้นผู้ดูแล
- **ผู้ดูแลระบบ** เห็นครบรวมถึงการนำเข้า CSV

การกรองเมนูเป็นเรื่อง UX เท่านั้น ขอบเขตความปลอดภัยจริงยังคงเป็น RLS และฟังก์ชัน `can_view_student`,
`can_record_assessment` ที่ฝั่งฐานข้อมูล จึงต้องทดสอบทั้งสองชั้นเสมอ
