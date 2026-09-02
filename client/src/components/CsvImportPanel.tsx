/**
 * Clinical Aurora — Controlled CSV import.
 * ทุกการเขียนข้อมูลผ่าน RPC `import_csv_rows` ซึ่งตรวจสิทธิ์ผู้ดูแลระบบ, resolve คีย์อ้างอิง
 * และบันทึก audit log ในทรานแซกชันเดียว ฝั่งเบราว์เซอร์ทำหน้าที่ตรวจไฟล์และแสดง preview เท่านั้น
 */
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export type ImportKind =
  | "students"
  | "staff"
  | "user_roles"
  | "course_instructors"
  | "class_advisor_scopes"
  | "class_advisor_assignments"
  | "course_enrollments"
  | "student_access"
  | "mapping_staging";

type CsvRow = Record<string, string>;

type ImportSpec = {
  label: string;
  hint: string;
  columns: string[];
  required: string[];
  template: string;
  previewFields: [string, string, string];
};

const ROLES = ["admin", "executive", "academic_affairs", "program_chair", "class_advisor", "lecturer", "student"] as const;
const allowedRoles = new Set<string>(ROLES);
const INSTRUCTOR_ROLES = new Set(["course_owner", "co_instructor", "clinical_preceptor"]);
const ADVISOR_KINDS = new Set(["class_advisor", "co_advisor"]);
const EMAIL_PATTERN = /^[^\s@]+@bcn\.ac\.th$/i;
const TERM_PATTERN = /^2[5-7]\d{2}\/[123]$/;
const BOM = "﻿";

export const specs: Record<ImportKind, ImportSpec> = {
  students: {
    label: "รายชื่อนักศึกษา",
    hint: "ระบุตัวตนด้วยอีเมลที่ใช้เข้าสู่ระบบ ไม่ต้องกรอกเลขบัตรประชาชน · กรอกอีเมลไว้ล่วงหน้าได้ก่อนนักศึกษาเข้าสู่ระบบครั้งแรก",
    columns: ["student_code", "full_name_th", "email", "admit_year", "current_year_level", "curriculum_version", "section", "is_active"],
    required: ["student_code", "full_name_th", "admit_year", "current_year_level", "curriculum_version"],
    previewFields: ["student_code", "full_name_th", "current_year_level"],
    template: [
      "# ฟอร์มรายชื่อนักศึกษา - วิทยาลัยพยาบาลบรมราชชนนี กรุงเทพ",
      "# บรรทัดที่ขึ้นต้นด้วย # เป็นคำอธิบาย ระบบจะไม่นำเข้า ลบทิ้งได้",
      "# student_code        = รหัสนักศึกษา (ห้ามซ้ำ)",
      "# full_name_th        = คำนำหน้า ชื่อ นามสกุล ภาษาไทย",
      "# email               = อีเมลที่นักศึกษาจะใช้เข้าสู่ระบบ กรอกล่วงหน้าได้ (เว้นว่างได้)",
      "#                       เมื่อเจ้าตัวล็อกอินครั้งแรก ระบบจะผูกให้เห็นผลของตนเองอัตโนมัติ",
      "# admit_year          = ปีการศึกษาที่เข้า (พ.ศ.) เช่น 2568",
      "# current_year_level  = ชั้นปีปัจจุบัน 1-4",
      "# curriculum_version  = รุ่นหลักสูตร เช่น 2565",
      "# section             = กลุ่ม/หมู่เรียน (เว้นว่างได้)",
      "# is_active           = true = กำลังศึกษา, false = พ้นสภาพ/สำเร็จการศึกษา",
      "# ไม่มีคอลัมน์เลขบัตรประชาชน เพราะระบบใช้อีเมลระบุตัวตนแล้ว",
      "# (หากงานทะเบียนจำเป็นต้องกระทบยอดกับระบบอื่น เพิ่มคอลัมน์ national_id เองได้ ระบบจะแฮชก่อนบันทึกและไม่เก็บเลขดิบ)",
      "student_code,full_name_th,email,admit_year,current_year_level,curriculum_version,section,is_active",
      "# 68010001,นางสาวตัวอย่าง ใจดี,68010001@bcn.ac.th,2568,1,2565,A,true",
      "",
    ].join("\n"),
  },
  staff: {
    label: "ผู้สอน/บุคลากร และสิทธิ์",
    hint: "หนึ่งคนมีหลายบทบาทได้ ใส่ในช่อง role คั่นด้วย | เช่น executive|program_chair|lecturer · กรอกล่วงหน้าได้ก่อนเจ้าตัวเข้าสู่ระบบครั้งแรก",
    columns: ["email", "display_name", "position_th", "department", "role", "can_edit", "is_active"],
    required: ["email", "display_name", "role"],
    previewFields: ["email", "display_name", "role"],
    template: [
      "# ฟอร์มผู้สอน/บุคลากร และสิทธิ์การใช้งาน",
      "# email        = บัญชี @bcn.ac.th เท่านั้น (กรอกล่วงหน้าได้ ไม่จำเป็นต้องเคยเข้าสู่ระบบมาก่อน)",
      "# display_name = คำนำหน้า ชื่อ นามสกุล",
      "# position_th  = ตำแหน่ง เช่น อาจารย์ / ผู้ช่วยศาสตราจารย์ / นักวิชาการศึกษา",
      "# department   = ภาควิชา/กลุ่มงาน",
      "# role         = admin, executive, academic_affairs, program_chair, class_advisor, lecturer, student",
      "#                มีหลายบทบาทได้ ใส่ในช่องเดียวคั่นด้วย | เช่น executive|program_chair|lecturer",
      "#                การนำเข้าจะแทนที่ชุดบทบาทเดิมทั้งหมดของคนนั้น",
      "# can_edit     = true เมื่อได้รับอนุมัติให้แก้ไขข้อมูล (ค่าเริ่มต้นควรเป็น false)",
      "# is_active    = true = ปฏิบัติงานอยู่",
      "email,display_name,position_th,department,role,can_edit,is_active",
      "# somchai.k@bcn.ac.th,นางสาวตัวอย่าง ทดสอบ,อาจารย์,ภาควิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ,lecturer,false,true",
      "# malee.s@bcn.ac.th,นางตัวอย่าง สองบทบาท,ผู้ช่วยศาสตราจารย์,ภาควิชาการพยาบาลเด็ก,program_chair|lecturer,true,true",
      "",
    ].join("\n"),
  },
  user_roles: {
    label: "ปรับสิทธิ์ผู้ใช้ (เฉพาะ role)",
    hint: "ใช้เมื่อต้องการเปลี่ยนเฉพาะบทบาท/สิทธิ์แก้ไข โดยไม่แตะข้อมูลชื่อและตำแหน่ง · กรอกล่วงหน้าได้เช่นกัน",
    columns: ["email", "role", "can_edit", "is_active"],
    required: ["email", "role"],
    previewFields: ["email", "role", "can_edit"],
    template: [
      "# ฟอร์มปรับสิทธิ์ผู้ใช้",
      "# role = admin, executive, academic_affairs, program_chair, class_advisor, lecturer, student",
      "#        มีหลายบทบาทได้ คั่นด้วย | เช่น executive|program_chair|lecturer",
      "email,role,can_edit,is_active",
      "# somchai.k@bcn.ac.th,lecturer,false,true",
      "",
    ].join("\n"),
  },
  course_instructors: {
    label: "ผู้สอนประจำรายวิชา",
    hint: "course_code รับได้ทั้งรหัสตามเล่มหลักสูตร (0101300xxx / GE 101) และรหัสในไฟล์ Curriculum Mapping (0118300xxx)",
    columns: ["course_code", "instructor_email", "instructor_role", "academic_year", "term"],
    required: ["course_code", "instructor_email", "academic_year"],
    previewFields: ["course_code", "instructor_email", "instructor_role"],
    template: [
      "# ฟอร์มผู้สอนประจำรายวิชา",
      "# course_code      = รหัสวิชา เช่น 0101300209 หรือ GE 101",
      "# instructor_email = อีเมล @bcn.ac.th ของผู้สอน",
      "# instructor_role  = course_owner (อาจารย์ผู้รับผิดชอบรายวิชา) | co_instructor (ผู้สอนร่วม) | clinical_preceptor (อาจารย์นิเทศ/พี่เลี้ยงแหล่งฝึก)",
      "# academic_year    = ปีการศึกษา (พ.ศ.) เช่น 2568",
      "# term             = ภาคการศึกษา รูปแบบ 2568/1 (เว้นว่างได้)",
      "course_code,instructor_email,instructor_role,academic_year,term",
      "# 0101300209,somchai.k@bcn.ac.th,course_owner,2568,2568/1",
      "",
    ].join("\n"),
  },
  class_advisor_scopes: {
    label: "อาจารย์ประจำชั้น (ทั้งชั้นปี)",
    hint: "หนึ่งแถวคือ อาจารย์ 1 คน รับผิดชอบ 1 ชั้นปี ครอบคลุมนักศึกษาทั้งชั้นโดยไม่ต้องไล่รายคน · ปีการศึกษาที่นำเข้าล่าสุดคือปีที่มีผล",
    columns: ["advisor_email", "academic_year", "year_level", "section", "advisor_kind"],
    required: ["advisor_email", "academic_year", "year_level"],
    previewFields: ["advisor_email", "year_level", "section"],
    template: [
      "# ฟอร์มอาจารย์ประจำชั้น (มอบหมายเป็นชั้นปี)",
      "# advisor_email = อีเมล @bcn.ac.th ของอาจารย์ประจำชั้น",
      "# academic_year = ปีการศึกษา (พ.ศ.) เช่น 2568",
      "# year_level    = ชั้นปีที่รับผิดชอบ 1-4",
      "# section       = เว้นว่าง = ทุกกลุ่มในชั้นปีนั้น หรือระบุกลุ่มเมื่อแบ่งกันดูแล เช่น A",
      "# advisor_kind  = class_advisor (หลัก) | co_advisor (ร่วม) เว้นว่าง = class_advisor",
      "#",
      "# นำเข้าครั้งเดียวครบทุกชั้นปี ระบบจะปิดการมอบหมายของปีการศึกษาอื่นให้อัตโนมัติ",
      "# นักศึกษาที่เลื่อนชั้นหรือเข้าใหม่จะเข้าขอบเขตของที่ปรึกษาชั้นนั้นเองโดยไม่ต้องแก้ไฟล์",
      "advisor_email,academic_year,year_level,section,advisor_kind",
      "# somchai.k@bcn.ac.th,2568,1,,class_advisor",
      "# malee.s@bcn.ac.th,2568,2,,class_advisor",
      "",
    ].join("\n"),
  },
  class_advisor_assignments: {
    label: "อาจารย์ที่ปรึกษา (รายบุคคล)",
    hint: "ใช้เฉพาะกรณียกเว้น เช่น นักศึกษาที่ต้องดูแลเป็นพิเศษนอกเหนือจากที่ปรึกษาประจำชั้น",
    columns: ["advisor_email", "student_code", "academic_year", "advisor_kind"],
    required: ["advisor_email", "student_code", "academic_year"],
    previewFields: ["advisor_email", "student_code", "academic_year"],
    template: [
      "# ฟอร์มอาจารย์ที่ปรึกษาประจำตัวนักศึกษา",
      "# advisor_email = อีเมล @bcn.ac.th ของอาจารย์ที่ปรึกษา",
      "# student_code  = รหัสนักศึกษา (ต้องนำเข้ารายชื่อนักศึกษาก่อน)",
      "# academic_year = ปีการศึกษา (พ.ศ.)",
      "# advisor_kind  = class_advisor (ที่ปรึกษาหลัก) | co_advisor (ที่ปรึกษาร่วม) เว้นว่าง = class_advisor",
      "advisor_email,student_code,academic_year,advisor_kind",
      "# somchai.k@bcn.ac.th,68010001,2568,class_advisor",
      "",
    ].join("\n"),
  },
  course_enrollments: {
    label: "การลงทะเบียนเรียน",
    hint: "ใช้กำหนดว่านักศึกษาคนใดเรียนรายวิชาใดในภาคการศึกษาใด เพื่อให้ระบบดึงคะแนนมาคำนวณ PLO ได้ถูกกลุ่ม",
    columns: ["student_code", "course_code", "term"],
    required: ["student_code", "course_code", "term"],
    previewFields: ["student_code", "course_code", "term"],
    template: [
      "# ฟอร์มการลงทะเบียนเรียนรายวิชา",
      "# student_code = รหัสนักศึกษา",
      "# course_code  = รหัสวิชา เช่น 0101300209 หรือ GE 101",
      "# term         = ภาคการศึกษา รูปแบบ ปีพ.ศ./ภาค เช่น 2568/1 (3 = ภาคฤดูร้อน)",
      "student_code,course_code,term",
      "# 68010001,0101300209,2568/1",
      "",
    ].join("\n"),
  },
  student_access: {
    label: "ผูกบัญชีนักศึกษากับรหัสนักศึกษา",
    hint: "ใช้เฉพาะกรณีที่อีเมลของนักศึกษาไม่ตรงกับที่บันทึกไว้ในรายชื่อ เพราะปกติระบบผูกให้อัตโนมัติจากคอลัมน์ email ในฟอร์มนักศึกษา",
    columns: ["email", "student_code"],
    required: ["email", "student_code"],
    previewFields: ["email", "student_code", "student_code"],
    template: [
      "# ฟอร์มผูกบัญชีผู้ใช้ของนักศึกษากับรหัสนักศึกษา (student self-view)",
      "email,student_code",
      "# 68010001@bcn.ac.th,68010001",
      "",
    ].join("\n"),
  },
  mapping_staging: {
    label: "Curriculum Mapping (staging)",
    hint: "นำเข้าเพื่อรอการทวนสอบก่อนเลื่อนขึ้นเป็น curriculum_map จริง",
    columns: ["curriculum_version", "year_level_text", "course_code", "course_name_th", "credits_text", "plo_code", "sub_plo_code", "mapping_level", "source_filename"],
    required: ["curriculum_version", "year_level_text", "course_code", "course_name_th", "plo_code", "sub_plo_code", "mapping_level", "source_filename"],
    previewFields: ["course_code", "course_name_th", "mapping_level"],
    template:
      "curriculum_version,year_level_text,course_code,course_name_th,credits_text,plo_code,sub_plo_code,mapping_level,source_filename\n" +
      "2565,พยาบาลศาสตรบัณฑิต ชั้นปีที่ 1,GE 101,ภาษาไทยเชิงวิชาการ,3(2-2-5),PLO1,1.3,R,Curriculum mapping 2565.xlsx\n",
  },
};

const KIND_ORDER: ImportKind[] = [
  "students",
  "staff",
  "user_roles",
  "course_instructors",
  "class_advisor_scopes",
  "class_advisor_assignments",
  "course_enrollments",
  "student_access",
  "mapping_staging",
];

/** อ่าน CSV รองรับ BOM, ค่าที่มีเครื่องหมายคำพูด และข้ามบรรทัดคำอธิบายที่ขึ้นต้นด้วย # */
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

  const dataRows = rows.filter((item) => !item[0]?.replace(BOM, "").startsWith("#"));
  if (dataRows.length < 2) return [];
  const headers = dataRows[0].map((header) => header.replace(BOM, "").trim());
  return dataRows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

/** หัวคอลัมน์ของไฟล์ (ข้ามบรรทัดคำอธิบาย) ใช้ตรวจว่าคอลัมน์บังคับครบหรือไม่ */
export function readHeader(text: string): string[] {
  const line = text
    .split(/\r?\n/)
    .map((item) => item.replace(BOM, "").trim())
    .find((item) => item.length > 0 && !item.startsWith("#"));
  return line ? line.split(",").map((item) => item.trim()) : [];
}

function keyOf(kind: ImportKind, row: CsvRow) {
  switch (kind) {
    case "students": return row.student_code;
    case "course_instructors": return `${row.course_code}|${row.instructor_email?.toLowerCase()}|${row.academic_year}`;
    case "class_advisor_assignments": return `${row.advisor_email?.toLowerCase()}|${row.student_code}|${row.academic_year}`;
    case "class_advisor_scopes": return `${row.advisor_email?.toLowerCase()}|${row.academic_year}|${row.year_level}|${row.section || "*"}`;
    case "course_enrollments": return `${row.student_code}|${row.course_code}|${row.term}`;
    case "mapping_staging": return `${row.course_code}|${row.plo_code}|${row.sub_plo_code}|${row.mapping_level}`;
    default: return row.email?.toLowerCase();
  }
}

export function validateRows(kind: ImportKind, rows: CsvRow[]) {
  const spec = specs[kind];
  const errors: string[] = [];
  const seen = new Set<string>();
  const seenEmails = new Set<string>();

  rows.forEach((row, index) => {
    const line = index + 2;
    spec.required.forEach((field) => {
      if (!row[field]?.trim()) errors.push(`แถว ${line}: ขาด ${field}`);
    });

    const key = keyOf(kind, row);
    if (key && seen.has(key)) errors.push(`แถว ${line}: ข้อมูลซ้ำในไฟล์ (${key})`);
    if (key) seen.add(key);

    if (kind === "students") {
      // เลขบัตรประชาชนไม่บังคับ แต่ถ้ากรอกมาต้องถูกต้อง
      if (row.national_id_hash?.trim() && !/^[a-f0-9]{64}$/i.test(row.national_id_hash)) errors.push(`แถว ${line}: national_id_hash ต้องเป็นค่าแฮช 64 ตัวอักษร`);
      if (row.national_id?.trim() && !/^\d{13}$/.test(row.national_id.replace(/\D/g, ""))) errors.push(`แถว ${line}: national_id ต้องเป็นตัวเลข 13 หลัก`);
      if (row.current_year_level && !/^[1-6]$/.test(row.current_year_level)) errors.push(`แถว ${line}: current_year_level ต้องอยู่ระหว่าง 1-6`);
      if (row.admit_year && !/^2[5-7]\d{2}$/.test(row.admit_year)) errors.push(`แถว ${line}: admit_year ต้องเป็นปี พ.ศ. 2500-2799`);
      if (row.curriculum_version && !/^2[5-7]\d{2}$/.test(row.curriculum_version)) errors.push(`แถว ${line}: curriculum_version ต้องเป็นปี พ.ศ. เช่น 2565`);
      if (row.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errors.push(`แถว ${line}: email ไม่ถูกต้อง`);
      if (row.email?.trim() && seenEmails.has(row.email.trim().toLowerCase())) errors.push(`แถว ${line}: email ซ้ำในไฟล์ (${row.email.trim()})`);
      if (row.email?.trim()) seenEmails.add(row.email.trim().toLowerCase());
    } else if (kind === "mapping_staging") {
      if (row.mapping_level && !["I", "R", "M", "P"].includes(row.mapping_level)) errors.push(`แถว ${line}: mapping_level ต้องเป็น I, R, M หรือ P`);
      if (row.curriculum_version && !/^2[5-7]\d{2}$/.test(row.curriculum_version)) errors.push(`แถว ${line}: curriculum_version ต้องเป็นปี พ.ศ. 2500-2799`);
    } else if (kind === "course_instructors") {
      if (row.instructor_email && !EMAIL_PATTERN.test(row.instructor_email)) errors.push(`แถว ${line}: instructor_email ต้องเป็นบัญชี @bcn.ac.th`);
      if (row.instructor_role && !INSTRUCTOR_ROLES.has(row.instructor_role)) errors.push(`แถว ${line}: instructor_role ต้องเป็น course_owner, co_instructor หรือ clinical_preceptor`);
      if (row.academic_year && !/^2[5-7]\d{2}$/.test(row.academic_year)) errors.push(`แถว ${line}: academic_year ต้องเป็นปี พ.ศ.`);
      if (row.term && !TERM_PATTERN.test(row.term)) errors.push(`แถว ${line}: term ต้องอยู่ในรูปแบบ 2568/1`);
    } else if (kind === "class_advisor_scopes") {
      if (row.advisor_email && !EMAIL_PATTERN.test(row.advisor_email)) errors.push(`แถว ${line}: advisor_email ต้องเป็นบัญชี @bcn.ac.th`);
      if (row.advisor_kind && !ADVISOR_KINDS.has(row.advisor_kind)) errors.push(`แถว ${line}: advisor_kind ต้องเป็น class_advisor หรือ co_advisor`);
      if (row.academic_year && !/^2[5-7]\d{2}$/.test(row.academic_year)) errors.push(`แถว ${line}: academic_year ต้องเป็นปี พ.ศ.`);
      if (row.year_level && !/^[1-6]$/.test(row.year_level)) errors.push(`แถว ${line}: year_level ต้องอยู่ระหว่าง 1-6`);
    } else if (kind === "class_advisor_assignments") {
      if (row.advisor_email && !EMAIL_PATTERN.test(row.advisor_email)) errors.push(`แถว ${line}: advisor_email ต้องเป็นบัญชี @bcn.ac.th`);
      if (row.advisor_kind && !ADVISOR_KINDS.has(row.advisor_kind)) errors.push(`แถว ${line}: advisor_kind ต้องเป็น class_advisor หรือ co_advisor`);
      if (row.academic_year && !/^2[5-7]\d{2}$/.test(row.academic_year)) errors.push(`แถว ${line}: academic_year ต้องเป็นปี พ.ศ.`);
    } else if (kind === "course_enrollments") {
      if (row.term && !TERM_PATTERN.test(row.term)) errors.push(`แถว ${line}: term ต้องอยู่ในรูปแบบ 2568/1`);
    } else {
      if (row.email && !EMAIL_PATTERN.test(row.email)) errors.push(`แถว ${line}: email ต้องเป็นบัญชี @bcn.ac.th`);
      // role รับได้หลายบทบาทในช่องเดียว คั่นด้วย |
      const roleList = (row.role ?? "").split("|").map((item) => item.trim()).filter(Boolean);
      if (row.role?.trim() && roleList.length === 0) errors.push(`แถว ${line}: ต้องระบุ role อย่างน้อยหนึ่งบทบาท`);
      roleList.filter((item) => !allowedRoles.has(item)).forEach((item) => errors.push(`แถว ${line}: role "${item}" ไม่อยู่ในรายการที่ระบบรองรับ`));
    }
  });
  return errors;
}

function downloadTemplate(kind: ImportKind) {
  const blob = new Blob([BOM + specs[kind].template], { type: "text/csv;charset=utf-8" });
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
    const header = readHeader(text);
    const optional = new Set(
      kind === "students" ? ["email", "section", "is_active"]
      : kind === "class_advisor_scopes" ? ["section", "advisor_kind"]
      : [],
    );
    const missingHeaders = spec.columns.filter((column) => !optional.has(column) && !header.includes(column));
    setErrors(
      parsed.length === 0
        ? ["ไม่พบข้อมูลแถวสำหรับนำเข้า (ตรวจว่าลบเครื่องหมาย # หน้าแถวข้อมูลแล้ว)"]
        : [...missingHeaders.map((column) => `ขาดคอลัมน์ ${column}`), ...validateRows(kind, parsed)],
    );
  };

  const importRows = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("กรุณาเข้าสู่ระบบก่อนนำเข้าข้อมูล");
      const { data, error } = await supabase.rpc("import_csv_rows", {
        p_kind: kind,
        p_rows: rows,
        p_source_name: fileName || null,
      });
      if (error) throw error;
      toast.success(`นำเข้า${spec.label}สำเร็จ`, { description: `บันทึก ${data ?? rows.length} รายการ และบันทึก audit log แล้ว` });
      setRows([]); setFileName(""); setErrors([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ";
      toast.error("นำเข้าข้อมูลไม่สำเร็จ", { description: message });
    } finally { setLoading(false); }
  };

  return <Card className="csv-import-panel"><CardContent>
    <div className="card-heading">
      <div>
        <p className="section-kicker">CONTROLLED IMPORT</p>
        <h2>นำเข้าข้อมูล CSV</h2>
        <p className="muted-copy">ตรวจสอบไฟล์ก่อนบันทึกจริง สิทธิ์นำเข้าจำกัดเฉพาะผู้ดูแลระบบผ่าน RLS และบันทึก audit log ทุกครั้ง</p>
      </div>
      <ShieldCheck size={22} />
    </div>

    <div className="csv-import-controls">
      <label>ประเภทข้อมูล
        <select value={kind} onChange={(event) => handleKindChange(event.target.value as ImportKind)}>
          {KIND_ORDER.map((item) => <option key={item} value={item}>{specs[item].label}</option>)}
        </select>
      </label>
      <Button type="button" variant="outline" onClick={() => downloadTemplate(kind)}><Download size={15} />ดาวน์โหลดฟอร์ม CSV</Button>
      <label className="csv-file-button"><FileUp size={15} />เลือกไฟล์ CSV
        <Input type="file" accept=".csv,text/csv" onChange={(event) => void handleFile(event.target.files?.[0])} />
      </label>
    </div>

    <p className="muted-copy csv-kind-hint">{spec.hint}</p>
    {fileName && <p className="csv-file-name">ไฟล์ที่เลือก: <strong>{fileName}</strong> · {rows.length} แถว</p>}

    {errors.length > 0 && <div className="csv-errors" role="alert"><AlertCircle size={16} /><div>
      {errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}
      {errors.length > 8 && <p>และอีก {errors.length - 8} รายการ</p>}
    </div></div>}

    {rows.length > 0 && errors.length === 0 && <div className="csv-preview">
      <p className="section-kicker">PREVIEW · {rows.length} ROWS</p>
      {rows.slice(0, 3).map((row, index) => <div className="csv-preview-row" key={`${keyOf(kind, row)}-${index}`}>
        <strong>{row[spec.previewFields[0]]}</strong>
        <span>{row[spec.previewFields[1]]}</span>
        <small>{row[spec.previewFields[2]]}</small>
      </div>)}
    </div>}

    <div className="csv-import-footer">
      <p><CheckCircle2 size={15} />ไม่รับรหัสผ่านหรือ Client Secret และไม่เก็บเลขบัตรประชาชน — ระบุตัวตนด้วยอีเมลและรหัสนักศึกษา</p>
      <Button type="button" onClick={() => void importRows()} disabled={!canImport}>
        {loading ? <><Loader2 className="animate-spin" size={15} />กำลังนำเข้า…</> : "ยืนยันและนำเข้า"}
      </Button>
    </div>
  </CardContent></Card>;
}
