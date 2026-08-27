export const ALLOWED_EVIDENCE_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] as const;
export const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;

export type AssessmentInput = { studentId: string; assessmentMethodId: string; rawScore: string; competencyLevel: string; term: string; attemptNo: string; file?: { type: string; size: number } | null };
export type ValidatedAssessmentInput = { valid: boolean; errors: string[]; raw: number; level: number; attempt: number };

export function validateAssessmentInput(input: AssessmentInput): ValidatedAssessmentInput {
  const errors: string[] = [];
  const raw = Number(input.rawScore);
  const level = Number(input.competencyLevel);
  const attempt = Number(input.attemptNo);
  if (!input.studentId || !input.assessmentMethodId) errors.push("ต้องเลือกนักศึกษาและจุดวัดผลก่อนบันทึก");
  if (!input.rawScore || !Number.isFinite(raw) || raw < 0) errors.push("คะแนนดิบต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
  if (!input.competencyLevel || !Number.isFinite(level) || level < 0 || level > 5) errors.push("ระดับสมรรถนะต้องอยู่ระหว่าง 0 ถึง 5");
  if (!/^\d{4}\/\d$/.test(input.term)) errors.push("ภาคเรียนต้องอยู่ในรูปแบบ เช่น 2568/1");
  if (!Number.isInteger(attempt) || attempt < 1) errors.push("ครั้งที่ประเมินต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
  if (input.file && (!ALLOWED_EVIDENCE_TYPES.includes(input.file.type as (typeof ALLOWED_EVIDENCE_TYPES)[number]) || input.file.size > MAX_EVIDENCE_BYTES)) errors.push("ไฟล์ต้องเป็น PDF/JPG/PNG/DOCX/XLSX และมีขนาดไม่เกิน 20 MB");
  return { valid: errors.length === 0, errors, raw, level, attempt };
}
