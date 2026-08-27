/** Clinical Aurora: cascading evidence rail and liquid navigation establish the persistent, non-centred dashboard structure. */
import { BookOpenText, ChevronDown, GraduationCap, LayoutDashboard, LogOut, Search, Settings2, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AppView = "overview" | "student" | "year" | "cohort" | "curriculum" | "admin";

const navItems: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "student", label: "รายคน", icon: UserRound },
  { id: "year", label: "ชั้นปี", icon: GraduationCap },
  { id: "cohort", label: "รายรุ่น", icon: UsersRound },
  { id: "curriculum", label: "หลักสูตร", icon: BookOpenText },
  { id: "admin", label: "ผู้ดูแล", icon: Settings2 },
];

export default function AppShell({ view, onViewChange, onExit, children }: { view: AppView; onViewChange: (view: AppView) => void; onExit: () => void; children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => item.id === view) ?? navItems[0];

  return <div className="app-surface">
    <aside className={`evidence-rail ${mobileOpen ? "is-mobile-open" : ""}`} aria-label="เมนูหลัก">
      <div className="rail-brand"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663912059158/OjLnCKytZGjLgGWM.png" alt="สัญลักษณ์ระบบ PLO" /><div><strong>ระบบประเมิน PLO</strong><span>BCNB · ASSESSMENT SYSTEM</span></div></div>
      <div className="rail-rule" />
      <div className="rail-path"><span>VERDICT PATH</span><div><i />คะแนนดิบ</div><div><i />หลักฐาน</div><div><i />คำตัดสิน</div></div>
      <nav className="rail-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={`liquid-nav-item ${view === item.id ? "active" : ""}`} onClick={() => { onViewChange(item.id); setMobileOpen(false); }} aria-current={view === item.id ? "page" : undefined}><span className="liquid-icon"><Icon size={19} /></span><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="rail-footer"><span className="live-dot" />ฐานข้อมูลเชื่อมต่อแล้ว</div>
    </aside>
    <main className="app-main">
      <header className="topbar">
        <button className="mobile-brand" onClick={() => setMobileOpen((value) => !value)} aria-label="เปิดเมนู"><img src="/manus-storage/plo-p-loop-logo_81277cb8.png" alt="" /></button>
        <div className="product-crumb"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663912059158/OjLnCKytZGjLgGWM.png" alt="" /><div><strong>ระบบประเมิน PLO</strong><span>ผลลัพธ์การเรียนรู้ <b>/</b> {current.label}</span></div></div>
        <div className="topbar-actions">
          <div className={`expanding-search ${searchOpen ? "open" : ""}`}><button onClick={() => setSearchOpen(true)} aria-label="ค้นหารหัสนักศึกษา"><Search size={18} /></button><Input aria-label="ค้นหารหัสนักศึกษา" placeholder="ค้นหารหัสนักศึกษา" onBlur={() => setSearchOpen(false)} /></div>
          <button className="role-pill" onClick={() => onViewChange("admin")}><span className="role-pulse" />ผู้ดูแลระบบ<ChevronDown size={14} /></button>
          <Avatar className="top-avatar"><AvatarFallback>PA</AvatarFallback></Avatar>
          <Button variant="ghost" size="icon" className="exit-button" onClick={onExit} aria-label="ออกจากระบบ"><LogOut size={18} /></Button>
        </div>
      </header>
      <div className="app-content">{children}</div>
    </main>
  </div>;
}
