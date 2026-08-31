/** Clinical Aurora: top-level routing keeps the secure login separate from a persistent evidence-rail application workspace. */
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell, { viewsForRole, type AppView } from "./components/AppShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminView from "./pages/AdminView";
import CohortView from "./pages/CohortView";
import CurriculumView from "./pages/CurriculumView";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import StudentView from "./pages/StudentView";
import { loadCurrentUser, type CurrentUser } from "./lib/session";
import { supabase } from "./lib/supabase";

const DEMO_USER: CurrentUser = { userId: "demo", email: "demo@bcn.ac.th", displayName: "โหมดตัวอย่าง", role: "admin", canEdit: false };

function App() {
  const previewParams = new URLSearchParams(window.location.search);
  const previewView = previewParams.get("view") as AppView | null;
  const demoMode = previewParams.get("demo") === "1";
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(demoMode ? DEMO_USER : null);
  const [authLoading, setAuthLoading] = useState(!demoMode);
  const [view, setView] = useState<AppView>(previewView ?? "overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const previewEntry = previewParams.get("entry") === "1";

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    const sync = async (hasSession: boolean) => {
      const user = hasSession ? await loadCurrentUser() : null;
      if (!active) return;
      setCurrentUser(user);
      setAuthLoading(false);
      // นักศึกษาเปิดมาที่ผลของตนเองทันที และเห็นเฉพาะเมนูที่ได้รับสิทธิ์
      if (user) setView((current) => (viewsForRole(user.role).includes(current) ? current : viewsForRole(user.role)[0]));
    };
    void supabase.auth.getSession().then(({ data }) => void sync(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => void sync(Boolean(session)));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [demoMode]);

  if (authLoading) return <ThemeProvider defaultTheme="dark"><div className="auth-loading">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน…</div></ThemeProvider>;
  if (!currentUser) return <ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Login onDemoEnter={() => { setCurrentUser(DEMO_USER); setAuthLoading(false); }} /></TooltipProvider></ThemeProvider>;

  const isStudent = currentUser.role === "student";
  const allowed = viewsForRole(currentUser.role);
  const activeView: AppView = allowed.includes(view) ? view : allowed[0];
  // นักศึกษาเห็นได้เฉพาะระเบียนของตนเอง ไม่ว่าจะกดมาจากที่ใด
  const studentIdForView = isStudent ? currentUser.studentId : selectedStudentId;
  const goStudent = (studentId?: string) => { if (!isStudent) setSelectedStudentId(studentId); setView("student"); };
  const exit = () => { if (!demoMode) void supabase.auth.signOut(); setCurrentUser(null); };

  return <ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster />
    <AppShell view={activeView} onViewChange={setView} onExit={exit} role={currentUser.role} displayName={currentUser.displayName}>
      {activeView === "overview" && <Dashboard onStudent={goStudent} demoMode={demoMode} />}
      {activeView === "student" && (isStudent && !currentUser.studentId
        ? <div className="history-empty">บัญชีนี้ยังไม่ได้ผูกกับระเบียนนักศึกษา — ติดต่องานทะเบียนเพื่อตรวจสอบว่าอีเมลตรงกับที่ลงทะเบียนไว้</div>
        : <StudentView initialEntry={previewEntry} studentId={studentIdForView} canRecord={!isStudent && currentUser.canEdit} />)}
      {activeView === "year" && <CohortView type="year" onStudent={goStudent} />}
      {activeView === "cohort" && <CohortView type="cohort" onStudent={goStudent} />}
      {activeView === "curriculum" && <CurriculumView />}
      {activeView === "admin" && <AdminView />}
    </AppShell>
  </TooltipProvider></ThemeProvider>;
}

export default function Root() { return <ErrorBoundary><App /></ErrorBoundary>; }
