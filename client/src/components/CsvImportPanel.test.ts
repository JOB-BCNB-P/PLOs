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
  it("accepts a student row identified by email, with no national id at all", () => {
    const errors = validateRows("students", [
      { student_code: "68010001", full_name_th: "นางสาวตัวอย่าง ใจดี", email: "68010001@bcn.ac.th", admit_year: "2568", current_year_level: "1", curriculum_version: "2565", section: "A", is_active: "true" },
    ]);
    expect(errors).toEqual([]);
  });

  it("no longer collects a national id but still validates one that is supplied", () => {
    expect(specs.students.columns).not.toContain("national_id");
    expect(specs.students.required).not.toContain("national_id");
    const errors = validateRows("students", [
      { student_code: "68010002", full_name_th: "ก", national_id: "123", admit_year: "2568", current_year_level: "1", curriculum_version: "2565" },
    ]);
    expect(errors.some((error) => error.includes("13 หลัก"))).toBe(true);
  });

  it("rejects duplicate student codes in one file", () => {
    const errors = validateRows("students", [
      { student_code: "68010001", full_name_th: "ก", admit_year: "2568", current_year_level: "1", curriculum_version: "2565" },
      { student_code: "68010001", full_name_th: "ข", admit_year: "2568", current_year_level: "1", curriculum_version: "2565" },
    ]);
    expect(errors.some((error) => error.includes("ข้อมูลซ้ำ"))).toBe(true);
  });

  it("accepts a valid staff role row", () => {
    const errors = validateRows("staff", [{ email: "lecturer@bcn.ac.th", display_name: "อาจารย์ทดสอบ", role: "lecturer", can_edit: "false", is_active: "true" }]);
    expect(errors).toEqual([]);
  });

  it("accepts several roles in one cell, separated by a pipe", () => {
    const errors = validateRows("staff", [
      { email: "malee.s@bcn.ac.th", display_name: "อาจารย์สองบทบาท", role: "executive|program_chair|lecturer", can_edit: "true", is_active: "true" },
    ]);
    expect(errors).toEqual([]);
  });

  it("names the offending role when one of several is unknown", () => {
    const errors = validateRows("staff", [
      { email: "malee.s@bcn.ac.th", display_name: "อาจารย์", role: "program_chair|dean" },
    ]);
    expect(errors.some((error) => error.includes('"dean"'))).toBe(true);
    expect(errors.some((error) => error.includes("program_chair"))).toBe(false);
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

  it("assigns a class advisor to a whole year level in one row", () => {
    expect(validateRows("class_advisor_scopes", [
      { advisor_email: "somchai.k@bcn.ac.th", academic_year: "2568", year_level: "1", section: "", advisor_kind: "class_advisor" },
      { advisor_email: "malee.s@bcn.ac.th", academic_year: "2568", year_level: "2", section: "", advisor_kind: "class_advisor" },
    ])).toEqual([]);
  });

  it("rejects a year level outside 1-6 and flags the same advisor twice on one year", () => {
    const errors = validateRows("class_advisor_scopes", [
      { advisor_email: "somchai.k@bcn.ac.th", academic_year: "2568", year_level: "9" },
      { advisor_email: "somchai.k@bcn.ac.th", academic_year: "2568", year_level: "9" },
    ]);
    expect(errors.some((error) => error.includes("year_level"))).toBe(true);
    expect(errors.some((error) => error.includes("ข้อมูลซ้ำ"))).toBe(true);
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
