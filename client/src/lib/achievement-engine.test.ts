/** Clinical Aurora: unit tests protect the approved M/P, all-sub-PLO, pending, and latest-remediation decision rules. */
import { describe, expect, it } from "vitest";
import { evaluatePlo, evaluateSubPlo, type AchievementRule, type Measurement } from "./achievement-engine";

const rule: AchievementRule = { passLevel: 3.51, decisionLevels: ["M", "P"], aggregationRule: "all" };
const measurement = (overrides: Partial<Measurement>): Measurement => ({ assessmentId: "assess-1", label: "สอบปฏิบัติ", level: "M", competencyLevel: 4, weight: 1, recordedAt: "2026-03-01T00:00:00Z", attemptNo: 1, ...overrides });

describe("Achievement Engine", () => {
  it("ignores I/R and passes a complete M/P measurement at the configured threshold", () => {
    const result = evaluateSubPlo({ code: "2.1", measurements: [measurement({ level: "I", competencyLevel: 1 }), measurement({ assessmentId: "m-1", competencyLevel: 3.51 })] }, rule);
    expect(result.status).toBe("achieved");
    expect(result.computedValue).toBe(3.51);
  });
  it("returns pending rather than failing when an M/P result is missing", () => {
    const result = evaluateSubPlo({ code: "2.1", measurements: [measurement({ competencyLevel: null })] }, rule);
    expect(result.status).toBe("pending");
  });
  it("uses the latest remediation attempt", () => {
    const result = evaluateSubPlo({ code: "2.1", measurements: [measurement({ competencyLevel: 2.5, recordedAt: "2026-02-01T00:00:00Z" }), measurement({ competencyLevel: 4.2, recordedAt: "2026-03-01T00:00:00Z", attemptNo: 2 })] }, rule);
    expect(result.status).toBe("achieved");
    expect(result.computedValue).toBe(4.2);
  });
  it("requires every sub-PLO when the aggregation rule is all", () => {
    const result = evaluatePlo("PLO2", [{ code: "2.1", measurements: [measurement({ competencyLevel: 4.2 })] }, { code: "2.2", measurements: [measurement({ assessmentId: "assess-2", competencyLevel: 3.1 })] }], rule);
    expect(result.status).toBe("not_achieved");
    expect(result.reasonText).toContain("ต้องผ่านทุกข้อ");
  });
});
