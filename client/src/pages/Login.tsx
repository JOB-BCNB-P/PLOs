/** Clinical Aurora: ทางเข้าเดียวสำหรับทุกบทบาท — ล็อกอินด้วยอีเมลของสถาบันผ่าน Google แล้วระบบให้สิทธิ์ตามรายชื่อที่ลงทะเบียนไว้ */
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthRedirectUrl, supabase } from "@/lib/supabase";

export default function Login({ onDemoEnter }: { onDemoEnter: () => void }) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const redirectUrl = getAuthRedirectUrl(window.location.origin);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl, queryParams: { access_type: "offline", prompt: "select_account" } },
    });
    setIsSigningIn(false);
    if (!error) return;
    const providerDisabled = error.message.toLowerCase().includes("provider is not enabled");
    toast.error(providerDisabled ? "ยังไม่ได้เปิด Google Provider ใน Supabase" : "ยังไม่สามารถเชื่อมต่อ Google ได้", {
      description: providerDisabled
        ? "ไปที่ Supabase → Authentication → Providers → Google แล้วเปิดใช้งาน พร้อมตรวจ Client ID, Secret และ Redirect URL"
        : error.message,
    });
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
        <div className="login-heading"><p className="eyebrow">SECURE ACCESS</p><h2>เข้าสู่ระบบ</h2><p>ใช้อีเมลของสถาบันได้ทั้งอาจารย์ บุคลากร และนักศึกษา</p></div>

        <div className="access-body">
          <div className="access-note"><ShieldCheck size={18} /><span>ระบบให้สิทธิ์ตามรายชื่อที่ลงทะเบียนไว้<br />ไม่ได้ให้สิทธิ์เพียงเพราะเข้าสู่ระบบสำเร็จ</span></div>
          <Button className="google-button" onClick={handleSignIn} disabled={isSigningIn}>
            <span className="google-g">G</span>{isSigningIn ? "กำลังเชื่อมต่อ…" : "เข้าสู่ระบบด้วยอีเมล (Google)"}<ArrowRight size={17} />
          </Button>
          <div className="access-roles">
            <p><UserRound size={14} /><strong>อาจารย์และบุคลากร</strong> ใช้บัญชี <b>@bcn.ac.th</b> จะได้รับบทบาทตามที่งานบุคลากรกำหนดไว้</p>
            <p><UserRound size={14} /><strong>นักศึกษา</strong> ใช้อีเมลที่แจ้งไว้กับงานทะเบียน ระบบจะแสดงเฉพาะผลการเรียนรู้ของตนเอง</p>
          </div>
          <p className="privacy-note">ยังไม่มีสิทธิ์ใช้งานหลังเข้าสู่ระบบ ให้ติดต่องานทะเบียนเพื่อตรวจสอบว่าอีเมลตรงกับที่ลงทะเบียนไว้</p>
        </div>

        <div className="login-divider"><span>สำหรับตรวจสอบหน้าจอ</span></div>
        <button className="demo-entry" onClick={onDemoEnter}><CheckCircle2 size={16} />เข้าสู่โหมดตัวอย่างข้อมูลจำลอง<ArrowRight size={16} /></button>
        <p className="login-legal">การเข้าสู่ระบบถือว่าคุณยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล และการบันทึกการเข้าถึงตาม PDPA</p>
      </div>
    </section>
  </div>;
}
