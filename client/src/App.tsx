/** Clinical Aurora: top-level routing keeps the secure login separate from a persistent evidence-rail application workspace. */
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell, { type AppView } from "./components/AppShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminView from "./pages/AdminView";
import CohortView from "./pages/CohortView";
import CurriculumView from "./pages/CurriculumView";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import StudentView from "./pages/StudentView";
import { supabase } from "./lib/supabase";

function App() {
  const previewParams = new URLSearchParams(window.location.search);
  const previewView = previewParams.get("view") as AppView | null;
  const demoMode = previewParams.get("demo") === "1";
  const [isInside, setIsInside] = useState(demoMode);
  const [authLoading, setAuthLoading] = useState(!demoMode);
  const [view, setView] = useState<AppView>(previewView ?? "overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const previewEntry = previewParams.get("entry") === "1";

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) { setIsInside(Boolean(data.session)); setAuthLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsInside(Boolean(session));
      setAuthLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [demoMode]);

  if (authLoading) return <ThemeProvider defaultTheme="dark"><div className="auth-loading">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน…</div></ThemeProvider>;
  if (!isInside) return <ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Login onDemoEnter={() => setIsInside(true)} /></TooltipProvider></ThemeProvider>;
  const goStudent = (studentId?: string) => { setSelectedStudentId(studentId); setView("student"); };
  const exit = () => { if (!demoMode) void supabase.auth.signOut(); setIsInside(false); };
  return <ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><AppShell view={view} onViewChange={setView} onExit={exit}>{view === "overview" && <Dashboard onStudent={goStudent} demoMode={demoMode} />}{view === "student" && <StudentView initialEntry={previewEntry} studentId={selectedStudentId} />}{view === "year" && <CohortView type="year" onStudent={goStudent} />}{view === "cohort" && <CohortView type="cohort" onStudent={goStudent} />}{view === "curriculum" && <CurriculumView />}{view === "admin" && <AdminView />}</AppShell></TooltipProvider></ThemeProvider>;
}

export default function Root() { return <ErrorBoundary><App /></ErrorBoundary>; }
