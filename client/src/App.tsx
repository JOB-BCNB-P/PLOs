/** Clinical Aurora: top-level routing keeps the secure login separate from a persistent evidence-rail application workspace. */
import { useState } from "react";
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

function App() {
  const previewParams = new URLSearchParams(window.location.search);
  const previewView = previewParams.get("view") as AppView | null;
  const [isInside, setIsInside] = useState(previewParams.get("demo") === "1");
  const [view, setView] = useState<AppView>(previewView ?? "overview");
  if (!isInside) return <ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Login onDemoEnter={() => setIsInside(true)} /></TooltipProvider></ThemeProvider>;
  const goStudent = () => setView("student");
  return <ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><AppShell view={view} onViewChange={setView} onExit={() => setIsInside(false)}>{view === "overview" && <Dashboard onStudent={goStudent} />}{view === "student" && <StudentView />}{view === "year" && <CohortView type="year" onStudent={goStudent} />}{view === "cohort" && <CohortView type="cohort" onStudent={goStudent} />}{view === "curriculum" && <CurriculumView />}{view === "admin" && <AdminView />}</AppShell></TooltipProvider></ThemeProvider>;
}

export default function Root() { return <ErrorBoundary><App /></ErrorBoundary>; }
