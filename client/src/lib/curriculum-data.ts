/**
 * โครงสร้างหลักสูตรจาก Supabase (ไม่มีข้อมูลสาธิต)
 * ใช้ในหน้า Curriculum เพื่อแสดง PLO, sub-PLO, รายวิชา และสุขภาพของ Curriculum Mapping ตามข้อมูลจริง
 */
import { supabase } from "@/lib/supabase";

export type MappingLevel = "I" | "R" | "M" | "P";
export type LoadStatus = "live" | "empty" | "error";

export type CurriculumOption = { id: string; version: string; status: string; effective_year: number };

export type SubPloSummary = {
  id: string;
  code: string;
  description: string;
  courses: number;
  levels: MappingLevel[];
};

export type PloStructure = {
  id: string;
  code: string;
  description: string;
  displayOrder: number;
  courses: number;
  subPlos: SubPloSummary[];
};

export type CurriculumStructure = {
  status: LoadStatus;
  message?: string;
  curriculum?: CurriculumOption;
  plos: PloStructure[];
  courseCount: number;
  mappingCount: number;
  totalCredits: number;
  /** sub-PLO ที่ยังไม่มีรายวิชาใดรับผิดชอบเลย */
  unmappedSubPlos: SubPloSummary[];
  /** sub-PLO ที่มีรายวิชารับผิดชอบ แต่ยังไม่มีจุด Mastery หรือ Practice จึงยังตัดสินผลไม่ได้ */
  subPlosWithoutDecisionPoint: SubPloSummary[];
};

const EMPTY: CurriculumStructure = {
  status: "empty",
  plos: [],
  courseCount: 0,
  mappingCount: 0,
  totalCredits: 0,
  unmappedSubPlos: [],
  subPlosWithoutDecisionPoint: [],
};

export async function listCurricula(): Promise<{ status: LoadStatus; data: CurriculumOption[] }> {
  const { data, error } = await supabase
    .from("curricula")
    .select("id,version,status,effective_year")
    .order("effective_year", { ascending: false });
  if (error) return { status: "error", data: [] };
  if (!data?.length) return { status: "empty", data: [] };
  return { status: "live", data: data as CurriculumOption[] };
}

export async function loadCurriculumStructure(curriculum: CurriculumOption): Promise<CurriculumStructure> {
  const [ploResult, courseResult] = await Promise.all([
    supabase.from("plos").select("id,code,description,display_order").eq("curriculum_id", curriculum.id).order("display_order"),
    supabase.from("courses").select("id,credits,course_type,is_active").eq("curriculum_id", curriculum.id),
  ]);
  if (ploResult.error || courseResult.error) {
    return { ...EMPTY, status: "error", message: ploResult.error?.message ?? courseResult.error?.message };
  }
  const ploRows = ploResult.data ?? [];
  const courseRows = courseResult.data ?? [];
  if (!ploRows.length) return { ...EMPTY, curriculum };

  const ploIds = ploRows.map((row) => row.id as string);
  const { data: subPloRows, error: subPloError } = await supabase
    .from("sub_plos")
    .select("id,plo_id,code,description,display_order")
    .in("plo_id", ploIds)
    .order("display_order");
  if (subPloError) return { ...EMPTY, status: "error", curriculum, message: subPloError.message };

  const courseIds = courseRows.map((row) => row.id as string);
  const { data: mapRows, error: mapError } = courseIds.length
    ? await supabase.from("curriculum_map").select("course_id,plo_id,sub_plo_id,level").in("course_id", courseIds)
    : { data: [], error: null };
  if (mapError) return { ...EMPTY, status: "error", curriculum, message: mapError.message };

  const subPloById = new Map((subPloRows ?? []).map((row) => [row.id as string, row]));
  const coursesBySubPlo = new Map<string, Set<string>>();
  const levelsBySubPlo = new Map<string, Set<MappingLevel>>();
  const coursesByPlo = new Map<string, Set<string>>();

  (mapRows ?? []).forEach((row) => {
    const courseId = row.course_id as string;
    const subPloId = row.sub_plo_id as string | null;
    const ownerPloId = subPloId ? (subPloById.get(subPloId)?.plo_id as string | undefined) : (row.plo_id as string | null) ?? undefined;
    if (ownerPloId) {
      if (!coursesByPlo.has(ownerPloId)) coursesByPlo.set(ownerPloId, new Set());
      coursesByPlo.get(ownerPloId)!.add(courseId);
    }
    if (!subPloId) return;
    if (!coursesBySubPlo.has(subPloId)) coursesBySubPlo.set(subPloId, new Set());
    coursesBySubPlo.get(subPloId)!.add(courseId);
    if (!levelsBySubPlo.has(subPloId)) levelsBySubPlo.set(subPloId, new Set());
    levelsBySubPlo.get(subPloId)!.add(row.level as MappingLevel);
  });

  const plos: PloStructure[] = ploRows.map((row) => {
    const subPlos: SubPloSummary[] = (subPloRows ?? [])
      .filter((sub) => sub.plo_id === row.id)
      .map((sub) => ({
        id: sub.id as string,
        code: sub.code as string,
        description: sub.description as string,
        courses: coursesBySubPlo.get(sub.id as string)?.size ?? 0,
        levels: Array.from(levelsBySubPlo.get(sub.id as string) ?? []),
      }));
    return {
      id: row.id as string,
      code: row.code as string,
      description: row.description as string,
      displayOrder: Number(row.display_order ?? 0),
      courses: coursesByPlo.get(row.id as string)?.size ?? 0,
      subPlos,
    };
  });

  const allSubPlos = plos.flatMap((plo) => plo.subPlos);
  return {
    status: "live",
    curriculum,
    plos,
    courseCount: courseRows.filter((row) => row.is_active !== false).length,
    mappingCount: (mapRows ?? []).length,
    totalCredits: courseRows
      .filter((row) => row.course_type !== "free_elective")
      .reduce((sum, row) => sum + Number(row.credits ?? 0), 0),
    unmappedSubPlos: allSubPlos.filter((sub) => sub.courses === 0),
    subPlosWithoutDecisionPoint: allSubPlos.filter(
      (sub) => sub.courses > 0 && !sub.levels.some((level) => level === "M" || level === "P"),
    ),
  };
}
