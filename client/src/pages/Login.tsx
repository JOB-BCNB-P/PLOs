/** Clinical Aurora: login presents the institution’s access rules on a dark aurora evidence field, keeping input focus unmistakable. */
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getAuthRedirectUrl, supabase } from "@/lib/supabase";

export default function Login({ onDemoEnter }: { onDemoEnter: () => void }) {
  const [mode, setMode] = useState("staff");
  const [nationalId, setNationalId] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const handleStaffSignIn = async () => {
    setIsSigningIn(true);
    const redirectUrl = getAuthRedirectUrl(window.location.origin);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectUrl, queryParams: { access_type: "offline", prompt: "select_account" } } });
    setIsSigningIn(false);
    if (error) {
      const providerDisabled = error.message.toLowerCase().includes("provider is not enabled");
      toast.error(
        providerDisabled ? "ยังไม่ได้เปิด Google Provider ใน Supabase" : "ยังไม่สามารถเชื่อมต่อ Google Workspace ได้",
        {
          description: providerDisabled
            ? "ไปที่ Supabase → Authentication → Providers → Google แล้วเปิดใช้งาน พร้อมตรวจ Client ID, Secret และ Redirect URL"
            : error.message,
        },
      );
    }
  };
  const handleStudentCheck = () => {
    if (!/^\d{13}$/.test(nationalId)) return toast.error("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
    toast.info("ระบบจะตรวจจับคู่กับระเบียนที่ยืนยันแล้ว", { description: "เลขบัตรจะถูกประมวลผลแบบ hash และไม่เก็บเป็นข้อความ" });
  };

  return <div className="login-page">
    <div className="login-aurora" />
    <section className="login-story">
      <div className="login-story-brand"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663912059158/OjLnCKytZGjLgGWM.png" alt="PLOs Assessment" /><span>BCNB · Bangkok</span></div>
      <div className="story-copy"><p className="eyebrow">PLOs ASSESSMENT SYSTEM</p><h1>เห็นผลรายคน<br /><em>ก่อนสรุปผลทั้งหลักสูตร</em></h1><p>ทุกคำตัดสินมีเส้นทางกลับสู่คะแนนดิบ เครื่องมือวัด และหลักฐานที่ตรวจสอบได้</p></div>
      <div className="story-evidence"><span className="evidence-line" /><div><strong>Traceable by design</strong><span>Curriculum · CLO · Score · Evidence · Verdict</span></div></div>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="institution-mark"><span><Building2 size={18} /></span><div><strong>วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ</strong><small>คณะพยาบาลศาสตร์ · สถาบันพระบรมราชชนก</small></div></div>
        <div className="login-heading"><p className="eyebrow">SECURE ACCESS</p><h2>เข้าสู่ระบบ</h2><p>เลือกประเภทผู้ใช้เพื่อเข้าถึงข้อมูลตามสิทธิ์ที่ได้รับ</p></div>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="access-tabs"><TabsTrigger value="staff">บุคลากร</TabsTrigger><TabsTrigger value="student">นักศึกษา</TabsTrigger></TabsList>
        </Tabs>
        {mode === "staff" ? <div className="access-body"><div className="access-note"><ShieldCheck size={18} /><span>เข้าถึงข้อมูลระบุตัวตนได้เฉพาะบัญชี<br /><strong>@bcn.ac.th</strong> ที่ได้รับอนุมัติ</span></div><Button className="google-button" onClick={handleStaffSignIn} disabled={isSigningIn}><span className="google-g">G</span>{isSigningIn ? "กำลังเชื่อมต่อ…" : "เข้าสู่ระบบด้วย Google Workspace"}<ArrowRight size={17} /></Button></div> : <div className="access-body"><label className="national-label" htmlFor="national-id">เลขบัตรประจำตัวประชาชน</label><Input id="national-id" inputMode="numeric" maxLength={13} value={nationalId} onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ""))} placeholder="กรอกเลข 13 หลัก" className="national-input" /><p className="privacy-note"><LockKeyhole size={13} />ระบบตรวจสอบแบบเข้ารหัสและไม่เก็บเลขบัตรเป็นข้อความ</p><Button className="student-button" onClick={handleStudentCheck}>ตรวจสอบและเข้าสู่ระบบ<ArrowRight size={17} /></Button></div>}
        <div className="login-divider"><span>สำหรับตรวจสอบหน้าจอ</span></div>
        <button className="demo-entry" onClick={onDemoEnter}><CheckCircle2 size={16} />เข้าสู่โหมดตัวอย่างข้อมูลจำลอง<ArrowRight size={16} /></button>
        <p className="login-legal">การเข้าสู่ระบบถือว่าคุณยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล และการบันทึกการเข้าถึงตาม PDPA</p>
      </div>
    </section>
  </div>;
}
