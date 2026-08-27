import { useEffect, useMemo, useRef, useState } from "react";
import { FileCheck2, FileUp, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { validateAssessmentInput } from "@/lib/assessment-validation";

type Props = { studentId?: string; assessmentMethodId?: string; onSaved?: () => void; onClose?: () => void };

export default function ScoreEntryForm({ studentId = "", assessmentMethodId = "", onSaved, onClose }: Props) {
  const [students, setStudents] = useState<{ id: string; student_code: string; full_name_th: string }[]>([]);
  const [methods, setMethods] = useState<{ id: string; method: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(studentId);
  const [selectedMethodId, setSelectedMethodId] = useState(assessmentMethodId);
  const [rawScore, setRawScore] = useState("");
  const [competencyLevel, setCompetencyLevel] = useState("");
  const [term, setTerm] = useState("2568/1");
  const [attemptNo, setAttemptNo] = useState("1");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fileStatus = useMemo(() => file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : "ยังไม่ได้เลือกไฟล์", [file]);
  useEffect(() => {
    let active = true;
    setLoadingReferences(true);
    Promise.all([
      supabase.from("students").select("id,student_code,full_name_th").eq("is_active", true).order("student_code").limit(100),
      supabase.from("assessment_methods").select("id,method").eq("is_active", true).limit(100),
    ]).then(([studentResult, methodResult]) => {
      if (!active) return;
      const error = studentResult.error ?? methodResult.error;
      if (error) setReferenceError("ไม่สามารถโหลดรายชื่อนักศึกษาและจุดวัดผลตามสิทธิ์ของบัญชีนี้ได้");
      else { setStudents(studentResult.data ?? []); setMethods(methodResult.data ?? []); }
    }).catch(() => { if (active) setReferenceError("เกิดข้อผิดพลาดขณะโหลดข้อมูลอ้างอิง"); }).finally(() => { if (active) setLoadingReferences(false); });
    return () => { active = false; };
  }, []);

  const validate = () => {
    const result = validateAssessmentInput({ studentId: selectedStudentId, assessmentMethodId: selectedMethodId, rawScore, competencyLevel, term, attemptNo, file });
    setErrors(result.errors);
    return result;
  };

  const submit = async () => {
    const checked = validate();
    if (!checked.valid) return;
    setSaving(true);
    toast.info("กำลังตรวจสอบสิทธิ์และเตรียมบันทึกข้อมูล…");
    let uploadedPath: string | null = null;
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกคะแนน");
      const { data: canRecord, error: permissionError } = await supabase.rpc("can_record_assessment", { p_assessment_method_id: selectedMethodId });
      if (permissionError) throw permissionError;
      if (canRecord === false) throw new Error("บัญชีนี้ไม่มีสิทธิ์บันทึกผลของจุดวัดผลที่เลือก");

      // Check for duplicate attempt before upload
      const { data: existing, error: checkError } = await supabase.from("scores")
        .select("id").eq("student_id", selectedStudentId).eq("assessment_method_id", selectedMethodId)
        .eq("term", term).eq("attempt_no", checked.attempt).maybeSingle();
      if (checkError) throw checkError;
      if (existing) throw new Error(`นักศึกษานี้มีผลประเมินครั้งที่ ${checked.attempt} ในภาคเรียน ${term} อยู่แล้ว กรุณาใช้ครั้งที่ประเมินใหม่`);

      if (file) {
        uploadedPath = `${selectedStudentId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("plo-evidence").upload(uploadedPath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { error: atomicError } = await supabase.rpc("record_score_with_evidence", {
          p_student_id: selectedStudentId,
          p_assessment_method_id: selectedMethodId,
          p_raw_score: checked.raw,
          p_competency_level: checked.level,
          p_term: term,
          p_attempt_no: checked.attempt,
          p_note: note.trim() || null,
          p_file_path: uploadedPath,
          p_file_name: file.name,
          p_mime_type: file.type,
        });
        if (atomicError) throw atomicError;
      } else {
        const { error: scoreError } = await supabase.rpc("record_score", {
          p_student_id: selectedStudentId,
          p_assessment_method_id: selectedMethodId,
          p_raw_score: checked.raw,
          p_competency_level: checked.level,
          p_term: term,
          p_attempt_no: checked.attempt,
          p_note: note.trim() || null,
        });
        if (scoreError) throw scoreError;
      }
      toast.success(file ? "บันทึกคะแนนและไฟล์หลักฐานเรียบร้อย" : "บันทึกคะแนนเรียบร้อย");
      setRawScore(""); setCompetencyLevel(""); setNote(""); setFile(null); if (inputRef.current) inputRef.current.value = "";
      onSaved?.();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("plo-evidence").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally { setSaving(false); }
  };

  return <Card className="score-entry-card" aria-busy={saving || loadingReferences}><CardContent>
    <div className="form-header"><div><p className="section-kicker">ASSESSMENT ENTRY</p><h2>บันทึกคะแนนและหลักฐาน</h2><p>ข้อมูลจะถูกตรวจสอบก่อนบันทึก และระบบจะคำนวณ PLO ที่เกี่ยวข้องให้อัตโนมัติ</p></div>{onClose && <Button variant="ghost" size="icon" onClick={onClose} aria-label="ปิด"><X size={18} /></Button>}</div>
    {loadingReferences && <div className="loading-inline" role="status" aria-live="polite"><Loader2 className="spin" size={16} />กำลังโหลดรายชื่อนักศึกษาและจุดวัดผล…</div>}
    {referenceError && <div className="validation-alert" role="alert"><FileCheck2 size={17} /><p>{referenceError}</p></div>}
    {errors.length > 0 && <div className="validation-alert" role="alert"><FileCheck2 size={17} /><div>{errors.map((error) => <p key={error}>{error}</p>)}</div></div>}
    <div className="entry-grid selector-grid">
      <label>นักศึกษา<select className="native-field" disabled={loadingReferences || saving} value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}><option value="">{loadingReferences ? "กำลังโหลด…" : "เลือกนักศึกษา"}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_code} · {student.full_name_th}</option>)}</select></label>
      <label>จุดวัดผล<select className="native-field" disabled={loadingReferences || saving} value={selectedMethodId} onChange={(event) => setSelectedMethodId(event.target.value)}><option value="">{loadingReferences ? "กำลังโหลด…" : "เลือก assessment method"}</option>{methods.map((method) => <option key={method.id} value={method.id}>{method.method}</option>)}</select></label>
      <label>คะแนนดิบ<input className="native-field" inputMode="decimal" value={rawScore} onChange={(event) => setRawScore(event.target.value)} placeholder="เช่น 82" /></label>
      <label>ระดับสมรรถนะ (0–5)<input className="native-field" inputMode="decimal" value={competencyLevel} onChange={(event) => setCompetencyLevel(event.target.value)} placeholder="เช่น 3.75" /></label>
      <label>ภาคเรียน<input className="native-field" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="2568/1" /></label>
      <label>ครั้งที่ประเมิน<input className="native-field" inputMode="numeric" value={attemptNo} onChange={(event) => setAttemptNo(event.target.value)} /></label>
    </div>
    <label className="wide-field">หมายเหตุ<textarea className="native-field" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="ระบุบริบทหรือเหตุผลประกอบ (ถ้ามี)" /></label>
    <div className="file-dropzone"><input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><FileUp size={20} /><div><strong>{file ? "ไฟล์พร้อมอัปโหลด" : "แนบหลักฐานการประเมิน"}</strong><span>{fileStatus}</span></div>{file && <Button variant="ghost" size="icon" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} aria-label="ลบไฟล์"><X size={16} /></Button>}</div>
    <div className="form-foot"><span>รองรับ PDF, JPG, PNG, DOCX, XLSX · ไม่เกิน 20 MB</span><Button onClick={submit} disabled={saving || loadingReferences || Boolean(referenceError)}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {saving ? "กำลังบันทึก…" : "ตรวจสอบและบันทึก"}</Button></div>
  </CardContent></Card>;
}
