import { describe, expect, it } from "vitest";
import { validateAssessmentInput } from "./assessment-validation";

describe("assessment input validation", () => {
  const valid = { studentId: "student-1", assessmentMethodId: "method-1", rawScore: "82", competencyLevel: "3.75", term: "2568/1", attemptNo: "1", file: { type: "application/pdf", size: 1024 } };
  it("accepts a valid score and evidence file", () => {
    expect(validateAssessmentInput(valid)).toMatchObject({ valid: true, raw: 82, level: 3.75, attempt: 1, errors: [] });
  });
  it("rejects competency values outside the 0-5 range", () => {
    expect(validateAssessmentInput({ ...valid, competencyLevel: "5.1" }).valid).toBe(false);
  });
  it("rejects incomplete term formats", () => {
    expect(validateAssessmentInput({ ...valid, term: "2025-1" }).errors).toContain("ภาคเรียนต้องอยู่ในรูปแบบ เช่น 2568/1");
  });
  it("rejects oversized or unsupported evidence", () => {
    expect(validateAssessmentInput({ ...valid, file: { type: "text/plain", size: 21 * 1024 * 1024 } }).errors).toHaveLength(1);
  });
});
