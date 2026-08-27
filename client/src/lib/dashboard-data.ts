import { supabase } from "@/lib/supabase";

export type YearAttainment = { year: string; students: number; attained: number; pending: number };
export type YearAttainmentResult = { status: "live" | "empty" | "error"; data: YearAttainment[] };

export async function loadYearAttainmentData(term: string): Promise<YearAttainmentResult> {
  const { data: students, error: studentsError } = await supabase.from("students").select("id,current_year_level").eq("is_active", true);
  if (studentsError) return { status: "error", data: [] };
  if (!students?.length) return { status: "empty", data: [] };
  const { data: achievements, error: achievementError } = await supabase.from("plo_achievement").select("student_id,status").eq("term", term);
  if (achievementError) return { status: "error", data: [] };
  const result = [1, 2, 3, 4, 5, 6].map((year) => {
    const ids = students.filter((student) => student.current_year_level === year).map((student) => student.id);
    const rows = achievements?.filter((row) => ids.includes(row.student_id)) ?? [];
    const byStudent = new Map<string, { achieved: number; decided: number }>();
    rows.forEach((row) => {
      const current = byStudent.get(row.student_id) ?? { achieved: 0, decided: 0 };
      current.achieved += row.status === "achieved" ? 1 : 0;
      current.decided += row.status === "pending" ? 0 : 1;
      byStudent.set(row.student_id, current);
    });
    const studentsWithResults = Array.from(byStudent.values());
    const totalDecided = studentsWithResults.reduce((sum, row) => sum + row.decided, 0);
    const totalAchieved = studentsWithResults.reduce((sum, row) => sum + row.achieved, 0);
    const totalPending = rows.filter((row) => row.status === "pending").length;
    return { year: `ปี ${year}`, students: ids.length, attained: totalDecided ? Math.round((totalAchieved / totalDecided) * 100) : 0, pending: totalPending };
  }).filter((row) => row.students > 0);
  return result.length ? { status: "live", data: result } : { status: "empty", data: [] };
}


export type StudentSearchResult = {
  id: string;
  student_code: string;
  full_name_th: string;
  current_year_level: number;
  admit_year: number;
};

export async function searchStudents(query: string): Promise<{ status: "live" | "empty" | "error"; data: StudentSearchResult[] }> {
  const normalized = query.trim();
  if (!normalized) return { status: "empty", data: [] };
  const safe = normalized.replace(/[%_,.*()]/g, "").slice(0, 80);
  if (!safe) return { status: "empty", data: [] };
  const { data, error } = await supabase
    .from("students")
    .select("id,student_code,full_name_th,current_year_level,admit_year")
    .eq("is_active", true)
    .or(`student_code.ilike.%${safe}%,full_name_th.ilike.%${safe}%`)
    .order("student_code")
    .limit(20);
  if (error) return { status: "error", data: [] };
  return data?.length ? { status: "live", data: data as StudentSearchResult[] } : { status: "empty", data: [] };
}
