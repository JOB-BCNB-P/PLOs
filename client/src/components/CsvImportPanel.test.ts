import { describe, expect, it } from "vitest";
import { parseCsv, readHeader, specs, validateRows } from "./CsvImportPanel";

describe("CSV import parsing", () => {
  it("parses quoted commas and UTF-8 BOM headers", () => {
    const rows = parseCsv("﻿email,display_name,role\nlecturer@bcn.ac.th,\"อาจารย์, ทดสอบ\",lecturer\n");
    expect(rows).toEqual([{ email: "lecturer@bcn.ac.th", display_name: "อาจารย์, ทดสอบ", role: "lecturer" }]);
  });

  it("skips comment lines so a filled-in template imports only real rows", () => {
    const text = "# คำอธิบาย\n# อีกบรรทัด\nemail,role\n# ตัวอย่าง,lecturer\nsomchai.k@bcn.ac.th,lecturer\n";
    expect(readHeader(text)).toEqual(["email", "role"]);
    expect(parseCsv(text)).toEqual([{ email: "somchai.k@bcn.ac.th", role: "lecturer" }]);
  });

  it("ships every template with its declared header row", () => {
    (Object.keys(specs) as Array<keyof typeof specs>).forEach((kind) => {
      const header = readHeader(specs[kind].template);
      specs[kind].required.forEach((column) => expect(header).toContain(column));
    });
  });
});

describe("CSV import validation", () => {
  it("accepts a student row that carries a raw national id", () => {
    const errors = validateRows("students", [
      { student_code: "68010001", full_name_th: "นางสาวตัวอย่าง ใจดี", national_id: "1103700000000", admit_year: "2568", current_year_level: "1", curriculum_version: "2565", section: "A", is_active: "true" },
    ]);
    expect(errors).toEqual([]);
  });

  it("rejects a bad identity hash and duplicate student codes", () => {
    const errors = validateRows("students", [
      { student_code: "68010001", full_name_th: "ก", national_id_hash: "bad", admit_year: "2568", current_year_level: "1", curriculum_version: "2565" },
      { student_code: "68010001", full_name_th: "ข", national_id_hash: "bad", admit_year: "2568", current_year_level: "1", curriculum_version: "2565" },
    ]);
    expect(errors.some((error) => error.includes("64 ตัวอักษร"))).toBe(true);
    expect(errors.some((error) => error.includes("ข้อมูลซ้ำ"))).toBe(true);
  });

  it("requires either national_id or national_id_hash", () => {
    const errors = validateRows("students", [
      { student_code: "68010002", full_name_th: "ค", admit_year: "2568", current_year_level: "1", curriculum_version: "2565" },
    ]);
    expect(errors.some((error) => error.includes("national_id"))).toBe(true);
  });

  it("accepts a valid staff role row", () => {
    const errors = validateRows("staff", [{ email: "lecturer@bcn.ac.th", display_name: "อาจารย์ทดสอบ", role: "lecturer", can_edit: "false", is_active: "true" }]);
    expect(errors).toEqual([]);
  });

  it("rejects unsupported role and non-organization email", () => {
    const errors = validateRows("user_roles", [{ email: "outside@example.com", role: "owner" }]);
    expect(errors).toHaveLength(2);
  });

  it("checks instructor role vocabulary and term format", () => {
    const errors = validateRows("course_instructors", [
      { course_code: "0101300209", instructor_email: "somchai.k@bcn.ac.th", instructor_role: "owner", academic_year: "2568", term: "1/2568" },
    ]);
    expect(errors.some((error) => error.includes("instructor_role"))).toBe(true);
    expect(errors.some((error) => error.includes("2568/1"))).toBe(true);
  });

  it("accepts advisor and enrollment rows in the documented shape", () => {
    expect(validateRows("class_advisor_assignments", [
      { advisor_email: "somchai.k@bcn.ac.th", student_code: "68010001", academic_year: "2568", advisor_kind: "class_advisor" },
    ])).toEqual([]);
    expect(validateRows("course_enrollments", [
      { student_code: "68010001", course_code: "0101300209", term: "2568/1" },
    ])).toEqual([]);
  });
});
