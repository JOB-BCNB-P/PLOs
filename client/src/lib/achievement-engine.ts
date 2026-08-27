/** Clinical Aurora: deterministic, explainable client-side mirror for validating the per-student PLO verdict rules. */

export type AchievementStatus = "achieved" | "not_achieved" | "pending";
export type MappingLevel = "I" | "R" | "M" | "P";

export type Measurement = {
  assessmentId: string;
  label: string;
  level: MappingLevel;
  competencyLevel: number | null;
  weight: number;
  recordedAt: string;
  attemptNo: number;
};

export type SubPloInput = { code: string; measurements: Measurement[] };

export type AchievementRule = {
  passLevel: number;
  decisionLevels: MappingLevel[];
  aggregationRule: "all" | "weighted_average" | "ratio";
  passingRatio?: number;
};

export type AchievementResult = {
  status: AchievementStatus;
  computedValue: number | null;
  reasonText: string;
  usedAssessmentIds: string[];
};

const labelStatus = (status: AchievementStatus) =>
  ({ achieved: "ผ่าน", not_achieved: "ไม่ผ่าน", pending: "ยังไม่ตัดสิน" })[status];

function latestByAssessment(measurements: Measurement[]): Measurement[] {
  return Object.values(
    measurements.reduce<Record<string, Measurement>>((latest, measurement) => {
      const current = latest[measurement.assessmentId];
      if (
        !current ||
        new Date(measurement.recordedAt).getTime() > new Date(current.recordedAt).getTime() ||
        (measurement.recordedAt === current.recordedAt && measurement.attemptNo > current.attemptNo)
      ) {
        latest[measurement.assessmentId] = measurement;
      }
      return latest;
    }, {}),
  );
}

export function evaluateSubPlo(input: SubPloInput, rule: AchievementRule): AchievementResult {
  const eligible = input.measurements.filter((item) => rule.decisionLevels.includes(item.level));
  const latest = latestByAssessment(eligible);
  const incomplete = latest.filter((item) => item.competencyLevel === null);
  const assessmentIds = latest.map((item) => item.assessmentId);

  if (eligible.length === 0) {
    return {
      status: "pending",
      computedValue: null,
      usedAssessmentIds: [],
      reasonText: `ยังไม่ตัดสิน ${input.code}: ยังไม่มีจุดวัดระดับ ${rule.decisionLevels.join("/")}`,
    };
  }
  if (incomplete.length > 0) {
    return {
      status: "pending",
      computedValue: null,
      usedAssessmentIds: assessmentIds,
      reasonText: `ยังไม่ตัดสิน ${input.code}: มีผลระดับ ${rule.decisionLevels.join("/")} ไม่ครบ ${latest.length - incomplete.length}/${latest.length} จุดวัด`,
    };
  }

  const totalWeight = latest.reduce((sum, item) => sum + item.weight, 0);
  const computedValue = Number(
    (latest.reduce((sum, item) => sum + (item.competencyLevel ?? 0) * item.weight, 0) / totalWeight).toFixed(2),
  );
  const status: AchievementStatus = computedValue >= rule.passLevel ? "achieved" : "not_achieved";
  const comparison = status === "achieved" ? "≥" : "<";
  return {
    status,
    computedValue,
    usedAssessmentIds: assessmentIds,
    reasonText: `${labelStatus(status)} ${input.code}: ค่าเฉลี่ยถ่วงน้ำหนัก ${computedValue.toFixed(2)} ${comparison} เกณฑ์ ${rule.passLevel.toFixed(2)}`,
  };
}

export function evaluatePlo(
  ploCode: string,
  subPlos: SubPloInput[],
  rule: AchievementRule,
): AchievementResult & { subResults: Array<AchievementResult & { code: string }> } {
  const subResults = subPlos.map((subPlo) => ({ code: subPlo.code, ...evaluateSubPlo(subPlo, rule) }));
  const usedAssessmentIds = subResults.flatMap((result) => result.usedAssessmentIds);
  const pending = subResults.filter((result) => result.status === "pending");
  const achieved = subResults.filter((result) => result.status === "achieved");
  const values = subResults.map((result) => result.computedValue).filter((value): value is number => value !== null);
  const computedValue = values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;

  if (pending.length > 0) {
    return {
      status: "pending",
      computedValue,
      usedAssessmentIds,
      subResults,
      reasonText: `ยังไม่ตัดสิน ${ploCode}: มี sub-PLO ที่ผลระดับ M/P ยังไม่ครบ ${pending.length} ข้อ`,
    };
  }
  if (rule.aggregationRule === "all") {
    const status: AchievementStatus = achieved.length === subResults.length ? "achieved" : "not_achieved";
    return {
      status,
      computedValue,
      usedAssessmentIds,
      subResults,
      reasonText:
        status === "achieved"
          ? `ผ่าน ${ploCode}: ผ่าน sub-PLO ครบทุกข้อ (${achieved.length}/${subResults.length})`
          : `ไม่ผ่าน ${ploCode}: ผ่าน sub-PLO ${achieved.length}/${subResults.length} ซึ่งไม่ครบตามกฎต้องผ่านทุกข้อ`,
    };
  }
  if (rule.aggregationRule === "ratio") {
    const ratio = achieved.length / subResults.length;
    const passingRatio = rule.passingRatio ?? 0.8;
    const status: AchievementStatus = ratio >= passingRatio ? "achieved" : "not_achieved";
    return { status, computedValue, usedAssessmentIds, subResults, reasonText: `${labelStatus(status)} ${ploCode}: ผ่าน sub-PLO ${(ratio * 100).toFixed(0)}% เทียบเกณฑ์ ${(passingRatio * 100).toFixed(0)}%` };
  }
  const status: AchievementStatus = (computedValue ?? 0) >= rule.passLevel ? "achieved" : "not_achieved";
  return { status, computedValue, usedAssessmentIds, subResults, reasonText: `${labelStatus(status)} ${ploCode}: ค่าเฉลี่ย sub-PLO ${(computedValue ?? 0).toFixed(2)} เทียบเกณฑ์ ${rule.passLevel.toFixed(2)}` };
}
