/**
 * ผู้ใช้ที่กำลังเข้าสู่ระบบ: อ่านโปรไฟล์ บทบาท และการผูกกับระเบียนนักศึกษา
 * ทุกบทบาทเข้าสู่ระบบด้วยอีเมลผ่าน Google เหมือนกัน สิทธิ์มาจากตาราง user_roles ไม่ใช่จากหน้าจอที่เลือก
 */
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "executive" | "academic_affairs" | "program_chair" | "class_advisor" | "lecturer" | "student";

export type CurrentUser = {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  canEdit: boolean;
  /** ระเบียนนักศึกษาที่ผูกกับบัญชีนี้ (มีเฉพาะบัญชีนักศึกษา) */
  studentId?: string;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "ผู้ดูแลระบบ",
  executive: "ผู้บริหาร",
  academic_affairs: "งานวิชาการ",
  program_chair: "ประธานหลักสูตร",
  class_advisor: "อาจารย์ที่ปรึกษา",
  lecturer: "อาจารย์ผู้สอน",
  student: "นักศึกษา",
};

export const isStaffRole = (role: AppRole) => role !== "student";

export async function loadCurrentUser(): Promise<CurrentUser | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [profileResult, roleResult, accessResult] = await Promise.all([
    supabase.from("profiles").select("email,display_name,can_edit").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("student_access").select("student_id").eq("user_id", user.id).maybeSingle(),
  ]);

  // บัญชีที่ยังไม่มีระเบียนบทบาท ให้ถือเป็นสิทธิ์ต่ำสุดไว้ก่อน ไม่ใช่สิทธิ์สูงสุด
  const role = (roleResult.data?.role as AppRole | undefined) ?? "student";
  return {
    userId: user.id,
    email: profileResult.data?.email ?? user.email ?? "",
    displayName: profileResult.data?.display_name ?? user.email ?? "ผู้ใช้",
    role,
    canEdit: Boolean(profileResult.data?.can_edit),
    studentId: (accessResult.data?.student_id as string | undefined) ?? undefined,
  };
}
