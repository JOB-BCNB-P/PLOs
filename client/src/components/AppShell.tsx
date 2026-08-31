/** Clinical Aurora: cascading evidence rail and liquid navigation establish the persistent, non-centred dashboard structure. */
import { BookOpenText, GraduationCap, LayoutDashboard, LogOut, Search, Settings2, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABEL, type AppRole } from "@/lib/session";

export type AppView = "overview" | "student" | "year" | "cohort" | "curriculum" | "admin";

const navItems: Array<{ id: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "ภาพรวม", icon: LayoutDashboard },
  { id: "student", label: "รายคน", icon: UserRound },
  { id: "year", label: "ชั้นปี", icon: GraduationCap },
  { id: "cohort", label: "รายรุ่น", icon: UsersRound },
  { id: "curriculum", label: "หลักสูตร", icon: BookOpenText },
  { id: "admin", label: "ผู้ดูแล", icon: Settings2 },
];

/** เมนูที่แต่ละบทบาทเห็น — นักศึกษาเห็นเฉพาะผลของตนเองและโครงสร้างหลักสูตร */
export function viewsForRole(role: AppRole): AppView[] {
  if (role === "student") return ["student", "curriculum"];
  if (role === "admin") return ["overview", "student", "year", "cohort", "curriculum", "admin"];
  return ["overview", "student", "year", "cohort", "curriculum"];
}

function initialsOf(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "PA";
  const parts = trimmed.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : trimmed.slice(0, 2)).toUpperCase();
}

export default function AppShell({
  view,
  onViewChange,
  onExit,
  role,
  displayName,
  children,
}: {
  view: AppView;
  onViewChange: (view: AppView) => void;
  onExit: () => void;
  role: AppRole;
  displayName: string;
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const allowed = viewsForRole(role);
  const visibleNav = navItems.filter((item) => allowed.includes(item.id));
  const current = visibleNav.find((item) => item.id === view) ?? visibleNav[0];

  return <div className="app-surface">
    <aside className={`evidence-rail ${mobileOpen ? "is-mobile-open" : ""}`} aria-label="เมนูหลัก">
      <div className="rail-brand"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663912059158/OjLnCKytZGjLgGWM.png" alt="สัญลักษณ์ระบบ PLO" /><div><strong>ระบบประเมิน PLO</strong><span>BCNB · ASSESSMENT SYSTEM</span></div></div>
      <div className="rail-rule" />
      <div className="rail-path"><span>VERDICT PATH</span><div><i />คะแนนดิบ</div><div><i />หลักฐาน</div><div><i />คำตัดสิน</div></div>
      <nav className="rail-nav">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={`liquid-nav-item ${view === item.id ? "active" : ""}`} onClick={() => { onViewChange(item.id); setMobileOpen(false); }} aria-current={view === item.id ? "page" : undefined}><span className="liquid-icon"><Icon size={19} /></span><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="rail-footer"><span className="live-dot" />ฐานข้อมูลเชื่อมต่อแล้ว</div>
    </aside>
    <main className="app-main">
      <header className="topbar">
        <button className="mobile-brand" onClick={() => setMobileOpen((value) => !value)} aria-label="เปิดเมนู"><img src="/manus-storage/plo-p-loop-logo_81277cb8.png" alt="" /></button>
        <div className="product-crumb"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663912059158/OjLnCKytZGjLgGWM.png" alt="" /><div><strong>ระบบประเมิน PLO</strong><span>ผลลัพธ์การเรียนรู้ <b>/</b> {current?.label ?? ""}</span></div></div>
        <div className="topbar-actions">
          {role !== "student" && <div className={`expanding-search ${searchOpen ? "open" : ""}`}><button onClick={() => setSearchOpen(true)} aria-label="ค้นหารหัสนักศึกษา"><Search size={18} /></button><Input aria-label="ค้นหารหัสนักศึกษา" placeholder="ค้นหารหัสนักศึกษา" onBlur={() => setSearchOpen(false)} /></div>}
          <span className="role-pill" title={displayName}><span className="role-pulse" />{ROLE_LABEL[role]}</span>
          <Avatar className="top-avatar"><AvatarFallback>{initialsOf(displayName)}</AvatarFallback></Avatar>
          <Button variant="ghost" size="icon" className="exit-button" onClick={onExit} aria-label="ออกจากระบบ"><LogOut size={18} /></Button>
        </div>
      </header>
      <div className="app-content">{children}</div>
    </main>
  </div>;
}
