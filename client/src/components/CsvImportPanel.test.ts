import { describe, expect, it } from "vitest";
import { parseCsv, validateRows } from "./CsvImportPanel";

describe("CSV import validation", () => {
  it("parses quoted commas and UTF-8 BOM headers", () => {
    const rows = parseCsv("\uFEFFemail,display_name,role\nlecturer@bcn.ac.th,\"อาจารย์, ทดสอบ\",lecturer\n");
    expect(rows).toEqual([{ email: "lecturer@bcn.ac.th", display_name: "อาจารย์, ทดสอบ", role: "lecturer" }]);
  });

  it("rejects invalid student identity hash and duplicate keys", () => {
    const errors = validateRows("students", [
      { student_code: "67123456", full_name_th: "ก", national_id_hash: "bad", admit_year: "2567", current_year_level: "1", curriculum_id: "curriculum-1" },
      { student_code: "67123456", full_name_th: "ข", national_id_hash: "bad", admit_year: "2567", current_year_level: "1", curriculum_id: "curriculum-1" },
    ]);
    expect(errors.some((error) => error.includes("SHA-256"))).toBe(true);
    expect(errors.some((error) => error.includes("ข้อมูลซ้ำ"))).toBe(true);
  });

  it("accepts a valid staff role row", () => {
    const errors = validateRows("staff", [{ email: "lecturer@bcn.ac.th", display_name: "อาจารย์ทดสอบ", role: "lecturer", can_edit: "true", is_active: "true" }]);
    expect(errors).toEqual([]);
  });

  it("rejects unsupported role and non-organization email", () => {
    const errors = validateRows("user_roles", [{ email: "outside@example.com", role: "owner" }]);
    expect(errors).toHaveLength(2);
  });
});
