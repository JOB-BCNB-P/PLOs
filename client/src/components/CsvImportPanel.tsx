import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type ImportKind = "students" | "staff" | "user_roles" | "mapping_staging";
type CsvRow = Record<string, string>;

type ImportSpec = {
  label: string;
  columns: string[];
  required: string[];
  template: string;
};

const specs: Record<ImportKind, ImportSpec> = {
  mapping_staging: {
    label: "Curriculum Mapping (staging)",
    columns: ["curriculum_version", "year_level_text", "course_code", "course_name_th", "credits_text", "plo_code", "sub_plo_code", "mapping_level", "source_filename"],
    required: ["curriculum_version", "year_level_text", "course_code", "course_name_th", "plo_code", "sub_plo_code", "mapping_level", "source_filename"],
    template: "curriculum_version,year_level_text,course_code,course_name_th,credits_text,plo_code,sub_plo_code,mapping_level,source_filename\n2565,พยาบาลศาสตรบัณฑิต ชั้นปีที่ 1,GE 101,ภาษาไทยเชิงวิชาการ,3(2-2-5),PLO1,1.3,R,Curriculummapping-2565วพบกรุงเทพพฤษภาคม65.xlsx\n",
  },
  students: {
    label: "นักศึกษา",
    columns: ["student_code", "full_name_th", "national_id_hash", "admit_year", "current_year_level", "curriculum_id", "is_active"],
    required: ["student_code", "full_name_th", "national_id_hash", "admit_year", "current_year_level", "curriculum_id"],
    template: "student_code,full_name_th,national_id_hash,admit_year,current_year_level,curriculum_id,is_active\n67123456,ตัวอย่าง นักศึกษา,ใส่ SHA-256 64 ตัวอักษรจากระบบที่อนุมัติ,2567,1,UUID ของ curricula,true\n",
  },
  staff: {
    label: "ผู้สอน/ผู้ดูแล",
    columns: ["email", "display_name", "role", "can_edit", "is_active"],
    required: ["email", "display_name", "role"],
    template: "email,display_name,role,can_edit,is_active\nlecturer@bcn.ac.th,ชื่อผู้สอน,lecturer,false,true\nadmin@bcn.ac.th,ชื่อผู้ดูแล,admin,true,true\n",
  },
  user_roles: {
    label: "สิทธิ์ผู้ใช้",
    columns: ["email", "role", "can_edit", "is_active"],
    required: ["email", "role"],
    template: "email,role,can_edit,is_active\nadmin@bcn.ac.th,admin,true,true\nlecturer@bcn.ac.th,lecturer,true,true\n",
  },
};

const allowedRoles = new Set(["admin", "executive", "academic_affairs", "program_chair", "class_advisor", "lecturer", "student"]);

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ""));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function asBoolean(value: string | undefined, fallback = true) {
  if (!value) return fallback;
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
}

export function validateRows(kind: ImportKind, rows: CsvRow[]) {
  const spec = specs[kind];
  const errors: string[] = [];
  const duplicateKeys = new Set<string>();
  rows.forEach((row, index) => {
    const line = index + 2;
    spec.required.forEach((field) => { if (!row[field]?.trim()) errors.push(`แถว ${line}: ขาด ${field}`); });
    const key = kind === "students" ? row.student_code : row.email?.toLowerCase();
    if (key && duplicateKeys.has(key)) errors.push(`แถว ${line}: ข้อมูลซ้ำในไฟล์ (${key})`);
    if (key) duplicateKeys.add(key);
    if (kind === "students") {
      if (row.national_id_hash && !/^[a-f0-9]{64}$/i.test(row.national_id_hash)) errors.push(`แถว ${line}: national_id_hash ต้องเป็น SHA-256 64 ตัวอักษร`);
      if (row.current_year_level && !/^[1-6]$/.test(row.current_year_level)) errors.push(`แถว ${line}: current_year_level ต้องอยู่ระหว่าง 1-6`);
      if (row.admit_year && !/^2[5-7]\d{2}$/.test(row.admit_year)) errors.push(`แถว ${line}: admit_year ต้องเป็นปี พ.ศ. 2500-2799`);
    } else if (kind === "mapping_staging") {
      if (row.mapping_level && !["I", "R", "M", "P"].includes(row.mapping_level)) errors.push(`แถว ${line}: mapping_level ต้องเป็น I, R, M หรือ P`);
      if (row.curriculum_version && !/^2[5-7]\d{2}$/.test(row.curriculum_version)) errors.push(`แถว ${line}: curriculum_version ต้องเป็นปี พ.ศ. 2500-2799`);
    } else {
      if (row.email && !/^[^\s@]+@bcn\.ac\.th$/i.test(row.email)) errors.push(`แถว ${line}: email ต้องเป็นบัญชี @bcn.ac.th`);
      if (row.role && !allowedRoles.has(row.role)) errors.push(`แถว ${line}: role ไม่อยู่ในรายการที่ระบบรองรับ`);
    }
  });
  return errors;
}

function downloadTemplate(kind: ImportKind) {
  const blob = new Blob(["\uFEFF" + specs[kind].template], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${kind}-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CsvImportPanel() {
  const [kind, setKind] = useState<ImportKind>("students");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const spec = specs[kind];
  const canImport = useMemo(() => rows.length > 0 && errors.length === 0 && !loading, [rows.length, errors.length, loading]);

  const handleKindChange = (next: ImportKind) => { setKind(next); setRows([]); setErrors([]); setFileName(""); };
  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrors(["ไฟล์ต้องมีขนาดไม่เกิน 5 MB"]); return; }
    const text = await file.text();
    const parsed = parseCsv(text);
    setFileName(file.name);
    setRows(parsed);
    const header = text.split(/\r?\n/, 1)[0]?.replace(/^\uFEFF/, "").split(",").map((item) => item.trim()) ?? [];
    const missingHeaders = spec.columns.filter((column) => !header.includes(column));
    setErrors(parsed.length === 0 ? ["ไม่พบข้อมูลแถวสำหรับนำเข้า"] : [...missingHeaders.map((column) => `ขาดคอลัมน์ ${column}`), ...validateRows(kind, parsed)]);
  };

  const importRows = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("กรุณาเข้าสู่ระบบก่อนนำเข้าข้อมูล");
      const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle();
      if (roleError) throw roleError;
      if (role?.role !== "admin") throw new Error("เฉพาะผู้ดูแลระบบเท่านั้นที่นำเข้า CSV ได้");

      if (kind === "mapping_staging") {
        const payload = rows.map((row) => ({ curriculum_version: row.curriculum_version, year_level_text: row.year_level_text, course_code: row.course_code, course_name_th: row.course_name_th, credits_text: row.credits_text || null, plo_code: row.plo_code, sub_plo_code: row.sub_plo_code, mapping_level: row.mapping_level, source_filename: row.source_filename, imported_by: auth.user.id }));
        const { error } = await supabase.from("curriculum_mapping_staging").upsert(payload, { onConflict: "curriculum_version,course_code,plo_code,sub_plo_code,mapping_level" });
        if (error) throw error;
      } else if (kind === "students") {
        const payload = rows.map((row) => ({ student_code: row.student_code, full_name_th: row.full_name_th, national_id_hash: row.national_id_hash.toLowerCase(), admit_year: Number(row.admit_year), current_year_level: Number(row.current_year_level), curriculum_id: row.curriculum_id, is_active: asBoolean(row.is_active) }));
        const { error } = await supabase.from("students").upsert(payload, { onConflict: "student_code" });
        if (error) throw error;
      } else {
        const emails = Array.from(new Set(rows.map((row) => row.email.toLowerCase())));
        const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,email").in("email", emails);
        if (profileError) throw profileError;
        const profileByEmail = new Map((profiles ?? []).map((profile) => [profile.email.toLowerCase(), profile.id]));
        const missing = emails.filter((email) => !profileByEmail.has(email));
        if (missing.length) throw new Error(`ยังไม่พบบัญชี Google ใน Supabase Auth: ${missing.join(", ")} กรุณาให้ผู้ใช้เข้าสู่ระบบอย่างน้อยหนึ่งครั้งก่อน`);
        const updates = rows.map((row) => ({ id: profileByEmail.get(row.email.toLowerCase()), email: row.email.toLowerCase(), display_name: row.display_name || null, can_edit: asBoolean(row.can_edit, false), is_active: asBoolean(row.is_active) }));
        const { error: updateError } = await supabase.from("profiles").upsert(updates, { onConflict: "id" });
        if (updateError) throw updateError;
        const roleRows = rows.map((row) => ({ user_id: profileByEmail.get(row.email.toLowerCase()), role: row.role, assigned_by: auth.user.id }));
        const { error: roleUpsertError } = await supabase.from("user_roles").upsert(roleRows, { onConflict: "user_id" });
        if (roleUpsertError) throw roleUpsertError;
      }
      const { error: auditError } = await supabase.from("audit_log").insert({ actor_user_id: auth.user.id, action: "CSV_IMPORT", target_table: kind === "mapping_staging" ? "curriculum_mapping_staging" : kind === "students" ? "students" : "profiles,user_roles", record_id: fileName || null, new_data: { import_kind: kind, row_count: rows.length }, reason: "Controlled CSV import" });
      if (auditError) console.warn("[CSV Import] Audit log could not be written", auditError);
      toast.success(`นำเข้าข้อมูล${spec.label}สำเร็จ`, { description: `${rows.length} รายการถูกตรวจสอบและบันทึกใน Supabase แล้ว` });
      setRows([]); setFileName(""); setErrors([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ";
      toast.error("นำเข้าข้อมูลไม่สำเร็จ", { description: message });
    } finally { setLoading(false); }
  };

  return <Card className="csv-import-panel"><CardContent>
    <div className="card-heading"><div><p className="section-kicker">CONTROLLED IMPORT</p><h2>นำเข้าข้อมูล CSV</h2><p className="muted-copy">ตรวจสอบไฟล์ก่อนบันทึกจริง และใช้ RLS จำกัดสิทธิ์เฉพาะผู้ดูแล</p></div><ShieldCheck size={22} /></div>
    <div className="csv-import-controls"><label>ประเภทข้อมูล<select value={kind} onChange={(event) => handleKindChange(event.target.value as ImportKind)}><option value="mapping_staging">Curriculum Mapping (staging)</option><option value="students">นักศึกษา</option><option value="staff">ผู้สอน/ผู้ดูแล</option><option value="user_roles">สิทธิ์ผู้ใช้</option></select></label><Button type="button" variant="outline" onClick={() => downloadTemplate(kind)}><Download size={15} />ดาวน์โหลด template</Button><label className="csv-file-button"><FileUp size={15} />เลือกไฟล์ CSV<Input type="file" accept=".csv,text/csv" onChange={(event) => void handleFile(event.target.files?.[0])} /></label></div>
    {fileName && <p className="csv-file-name">ไฟล์ที่เลือก: <strong>{fileName}</strong> · {rows.length} แถว</p>}
    {errors.length > 0 && <div className="csv-errors" role="alert"><AlertCircle size={16} /><div>{errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}{errors.length > 8 && <p>และอีก {errors.length - 8} รายการ</p>}</div></div>}
    {rows.length > 0 && errors.length === 0 && <div className="csv-preview"><p className="section-kicker">PREVIEW · {rows.length} ROWS</p>{rows.slice(0, 3).map((row, index) => <div className="csv-preview-row" key={`${row[spec.columns[0]]}-${index}`}><strong>{row[spec.columns[0]]}</strong><span>{row[spec.columns[1]]}</span><small>{kind === "students" ? `ชั้นปี ${row.current_year_level}` : kind === "mapping_staging" ? `${row.plo_code} · ${row.sub_plo_code} · ${row.mapping_level}` : row.role}</small></div>)}</div>}
    <div className="csv-import-footer"><p><CheckCircle2 size={15} />ระบบจะไม่รับ password, Client Secret หรือเลขบัตรประชาชนแบบ raw</p><Button type="button" onClick={() => void importRows()} disabled={!canImport}>{loading ? <><Loader2 className="animate-spin" size={15} />กำลังนำเข้า…</> : "ยืนยันและนำเข้า"}</Button></div>
  </CardContent></Card>;
}
