/**
 * Clinical Aurora: หน้าเข้าสู่ระบบมีปุ่มเลือกบทบาทเพื่อบอกขั้นตอนให้ตรงกลุ่มผู้ใช้
 * แต่ทั้งสองกลุ่มเข้าสู่ระบบด้วยอีเมลผ่าน Google เหมือนกัน และสิทธิ์จริงมาจากรายชื่อที่ลงทะเบียนไว้
 * ไม่ใช่จากปุ่มที่ผู้ใช้เลือก — ปุ่มนี้เป็นเพียงคำแนะนำการใช้งาน
 */
import { useState } from "react";
import { ArrowRight, Building2, CheckCircle2, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getAuthRedirectUrl, supabase } from "@/lib/supabase";

type AccessMode = "staff" | "student";

const MODE_COPY: Record<AccessMode, { note: React.ReactNode; button: string; steps: string[] }> = {
  staff: {
    note: <>ใช้บัญชีอีเมลของสถาบัน <strong>@bcn.ac.th</strong><br />ระบบให้บทบาทตามที่งานบุคลากรลงทะเบียนไว้</>,
    button: "เข้าสู่ระบบด้วยอีเมล @bcn.ac.th",
    steps: [
      "อาจารย์ ที่ปรึกษา ประธานหลักสูตร งานวิชาการ และผู้บริหาร ใช้ทางเข้านี้",
      "หากเข้าได้แต่ยังไม่เห็นเมนูที่ควรมี ให้แจ้งผู้ดูแลระบบตรวจบทบาทในรายชื่อบุคลากร",
    ],
  },
  student: {
    note: <>ใช้อีเมลที่แจ้งไว้กับ<strong>งานทะเบียน</strong><br />ระบบจะแสดงเฉพาะผลการเรียนรู้ของตนเองเท่านั้น</>,
    button: "เข้าสู่ระบบด้วยอีเมลนักศึกษา",
    steps: [
      "ต้องเป็นอีเมลเดียวกับที่ลงทะเบียนไว้ในระบบ จึงจะผูกกับระเบียนนักศึกษาได้",
      "หากเข้าได้แต่ระบบแจ้งว่ายังไม่ผูกระเบียน ให้ติดต่องานทะเบียนเพื่อตรวจอีเมล",
    ],
  },
};

export default function Login({ onDemoEnter }: { onDemoEnter: () => void }) {
  const [mode, setMode] = useState<AccessMode>("staff");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const copy = MODE_COPY[mode];

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const redirectUrl = getAuthRedirectUrl(window.location.origin);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        // hd เป็นเพียงตัวช่วยกรองบัญชีในหน้าเลือกของ Google ไม่ใช่การบังคับสิทธิ์
        queryParams: mode === "staff"
          ? { access_type: "offline", prompt: "select_account", hd: "bcn.ac.th" }
          : { access_type: "offline", prompt: "select_account" },
      },
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
        <div className="login-heading"><p className="eyebrow">SECURE ACCESS</p><h2>เข้าสู่ระบบ</h2><p>เลือกประเภทผู้ใช้ แล้วเข้าสู่ระบบด้วยอีเมลของคุณ</p></div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as AccessMode)}>
          <TabsList className="access-tabs">
            <TabsTrigger value="staff"><UserRound size={15} />บุคลากร/อาจารย์</TabsTrigger>
            <TabsTrigger value="student"><GraduationCap size={15} />นักศึกษา</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="access-body">
          <div className="access-note"><ShieldCheck size={18} /><span>{copy.note}</span></div>
          <Button className="google-button" onClick={handleSignIn} disabled={isSigningIn}>
            <span className="google-g">G</span>{isSigningIn ? "กำลังเชื่อมต่อ…" : copy.button}<ArrowRight size={17} />
          </Button>
          <div className="access-roles">
            {copy.steps.map((step) => <p key={step}><CheckCircle2 size={13} />{step}</p>)}
          </div>
          <p className="privacy-note">การเลือกประเภทผู้ใช้เป็นเพียงคำแนะนำขั้นตอน สิทธิ์ที่ได้รับมาจากรายชื่อที่ลงทะเบียนไว้ในระบบเสมอ</p>
        </div>

        <div className="login-divider"><span>สำหรับตรวจสอบหน้าจอ</span></div>
        <button className="demo-entry" onClick={onDemoEnter}><CheckCircle2 size={16} />เข้าสู่โหมดตัวอย่างข้อมูลจำลอง<ArrowRight size={16} /></button>
        <p className="login-legal">การเข้าสู่ระบบถือว่าคุณยอมรับนโยบายคุ้มครองข้อมูลส่วนบุคคล และการบันทึกการเข้าถึงตาม PDPA</p>
      </div>
    </section>
  </div>;
}
