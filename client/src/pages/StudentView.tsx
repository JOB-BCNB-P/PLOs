/** Clinical Aurora: the individual view puts the PLO verdict first, with an unbroken evidence thread down to individual measurements. */
import { useEffect, useState } from "react";
import { ChevronDown, Download, Eye, FileText, RotateCcw, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PloBadge from "@/components/PloBadge";
import EvidenceSpine from "@/components/EvidenceSpine";
import ReportActions from "@/components/ReportActions";
import ScoreEntryForm from "@/components/ScoreEntryForm";
import EvidenceHistory from "@/components/EvidenceHistory";
import { demoStudent } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";
import type { AssessmentReportRow } from "@/lib/report-utils";

const studentReportRows: AssessmentReportRow[] = demoStudent.plos.map((plo) => ({ studentCode: demoStudent.studentCode, studentName: demoStudent.name, yearLevel: demoStudent.yearLevel, plo: plo.code, value: plo.value, status: plo.status, term: "2568/1", reason: plo.note, sourceEvidence: plo.code === "PLO2" ? "NU44110 · Practical examination" : "Assessment record" }));

type LivePlo = { code: string; title: string; status: "achieved" | "not_achieved" | "pending"; value: number | null; note: string };

export default function StudentView({ initialEntry = false, studentId, canRecord = true }: { initialEntry?: boolean; studentId?: string; canRecord?: boolean }) {
  const [openPlo, setOpenPlo] = useState("PLO2");
  const [showEntry, setShowEntry] = useState(initialEntry);
  const [liveStudent, setLiveStudent] = useState<{ full_name_th: string; student_code: string; current_year_level: number; admit_year: number; curriculum_id: string } | null>(null);
  const [studentLoadError, setStudentLoadError] = useState("");
  const [livePlos, setLivePlos] = useState<LivePlo[] | null>(null);
  const [livePloLoading, setLivePloLoading] = useState(false);
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    void supabase.from("students").select("full_name_th,student_code,current_year_level,admit_year,curriculum_id").eq("id", studentId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setStudentLoadError("ไม่สามารถอ่านระเบียนนักศึกษาตามสิทธิ์ของบัญชีนี้ได้");
      else setLiveStudent(data);
    });
    return () => { active = false; };
  }, [studentId]);
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    setLivePloLoading(true);
    void supabase.from("plo_achievement").select("status,computed_value,reason_text,plos(code,description)").eq("student_id", studentId).eq("term", "2568/1").order("calculated_at", { ascending: false }).limit(100).then(({ data, error }) => {
      if (!active) return;
      if (error) setStudentLoadError("ไม่สามารถอ่านผล PLO ตามสิทธิ์ของบัญชีนี้ได้");
      else {
        const rows = (data ?? []) as Array<{ status: LivePlo["status"]; computed_value: number | string | null; reason_text: string; plos?: { code?: string; description?: string } | null }>;
        setLivePlos(rows.filter((row) => row.plos?.code).map((row) => ({ code: row.plos?.code ?? "", title: row.plos?.description ?? row.plos?.code ?? "PLO", status: row.status, value: row.computed_value === null ? null : Number(row.computed_value), note: row.reason_text })));
      }
      setLivePloLoading(false);
    });
    return () => { active = false; };
  }, [studentId]);
  const displayedPlos: LivePlo[] = studentId ? (livePlos ?? []) : demoStudent.plos;
  const displayedTotals = studentId && livePlos ? { achieved: displayedPlos.filter((plo) => plo.status === "achieved").length, notAchieved: displayedPlos.filter((plo) => plo.status === "not_achieved").length, pending: displayedPlos.filter((plo) => plo.status === "pending").length } : demoStudent.total;
  const reportRows = studentId ? displayedPlos.map((plo) => ({ studentCode: liveStudent?.student_code ?? "", studentName: liveStudent?.full_name_th ?? "", yearLevel: liveStudent?.current_year_level ?? "", plo: plo.code, value: plo.value, status: plo.status, term: "2568/1", reason: plo.note, sourceEvidence: "plo_achievement · Supabase" })) : studentReportRows;
  return <div className="student-view">
    <section className="page-lead student-lead"><div className="lead-copy"><p className="eyebrow">INDIVIDUAL VERDICT · {studentId ? "SUPABASE LIVE" : "DEMO"}</p><h1>คำตัดสินที่<br /><em>เริ่มจากรายบุคคล</em></h1><p>ตรวจสอบผล PLO ของนักศึกษาพร้อมที่มาของคะแนน เครื่องมือ และหลักฐาน โดยยึดกฎที่อนุมัติแล้ว</p></div>{canRecord && <div className="student-search-card"><div className="search-caption"><Search size={16} /><span>ค้นหารหัสนักศึกษา</span></div><Input defaultValue={demoStudent.studentCode} /><Button size="icon"><Search size={17} /></Button><small>ผู้ใช้จริงเข้าดูเฉพาะขอบเขตที่ได้รับสิทธิ์</small></div>}</section>
    {studentLoadError && <div className="validation-alert" role="alert"><FileText size={17} /><p>{studentLoadError}</p></div>}
    <EvidenceSpine items={[{ label: "คะแนนดิบ", detail: "เฉพาะผลล่าสุด" }, { label: "sub-PLO", detail: "ค่าเฉลี่ยถ่วงน้ำหนัก" }, { label: "PLO verdict", detail: "คำตัดสินรายบุคคล" }, { label: "แผนดูแล", detail: "ซ่อมเสริม/ติดตาม" }]} active={2} />
    <Card className="student-identity-card"><CardContent><div className="student-avatar">นศ</div><div className="identity-copy"><p className="section-kicker">STUDENT RECORD</p><h2>{liveStudent?.full_name_th ?? demoStudent.name} <span>({liveStudent?.student_code ?? demoStudent.studentCode})</span></h2><p>{liveStudent ? `หลักสูตร ${liveStudent.curriculum_id} · ชั้นปี ${liveStudent.current_year_level} · รับเข้า ${liveStudent.admit_year}` : `${demoStudent.curriculum} · ชั้นปี ${demoStudent.yearLevel} · รุ่น ${demoStudent.cohort}`}</p></div><div className="verdict-summary"><div><span className="summary-number achieved">{displayedTotals.achieved}</span><small>ผ่าน</small></div><div><span className="summary-number failed">{displayedTotals.notAchieved}</span><small>ไม่ผ่าน</small></div><div><span className="summary-number pending">{displayedTotals.pending}</span><small>ยังไม่ตัดสิน</small></div></div><div className="identity-actions"><ReportActions rows={reportRows} fileName={`plo-${liveStudent?.student_code ?? demoStudent.studentCode}`} />{canRecord && <Button className="report-button" onClick={() => setShowEntry((current) => !current)}><Download size={16} />{showEntry ? "ซ่อนฟอร์ม" : "บันทึกคะแนน"}</Button>}</div></CardContent></Card>
    <section className="verdict-context"><div><span className="context-dot" />ใช้เกณฑ์ปัจจุบัน: ระดับ M/P · ผ่านที่ 3.51 · ต้องผ่านทุก sub-PLO</div><button><ShieldCheck size={15} />ดู Rule snapshot</button></section>
    {canRecord && showEntry && <ScoreEntryForm studentId={studentId} onClose={() => setShowEntry(false)} onSaved={() => setShowEntry(false)} />}
    <EvidenceHistory studentId={studentId} />
    {studentId && livePloLoading && <div className="loading-inline" role="status"><span className="loading-dot" />กำลังโหลดผล PLO ของนักศึกษา…</div>}
    {studentId && !livePloLoading && livePlos?.length === 0 && <div className="history-empty"><FileText size={20} />ยังไม่มีผล PLO ที่คำนวณแล้วสำหรับภาคเรียน 2568/1</div>}
    <section className="plo-verdict-list">{displayedPlos.map((plo, index) => <Card key={plo.code} className={`verdict-card ${openPlo === plo.code ? "is-open" : ""}`}><CardContent><button className="verdict-head" onClick={() => setOpenPlo(openPlo === plo.code ? "" : plo.code)}><div className="verdict-index"><span>{String(index + 1).padStart(2, "0")}</span><strong>{plo.code}</strong></div><div className="verdict-title"><h2>{plo.title}</h2><p>{plo.note}</p></div><div className="verdict-value"><strong>{plo.value?.toFixed(2) ?? "—"}</strong><span>/ 3.51</span></div><PloBadge status={plo.status} /><ChevronDown className="verdict-chevron" size={19} /></button>{openPlo === plo.code && <div className="evidence-drawer">{!studentId && plo.code === "PLO2" ? <><div className="evidence-drawer-top"><div><p className="section-kicker">EXPLAINABLE VERDICT</p><h3>เหตุผลของคำตัดสิน</h3></div><span className="engine-tag"><Sparkles size={14} />คำนวณตามกฎ</span></div><div className="reason-callout"><strong>ไม่ผ่าน PLO2</strong> เนื่องจาก sub-PLO 2.1 มีค่าถ่วงน้ำหนัก 2.80 ซึ่งต่ำกว่าเกณฑ์ 3.51 แม้ sub-PLO อื่นจะผ่านแล้ว โดยใช้กฎ “ต้องผ่านทุก sub-PLO”</div><div className="evidence-thread"><span className="thread-line" />{demoStudent.evidence.map((item, itemIndex) => <div className="evidence-node" key={item.code}><span className="thread-node">{itemIndex + 1}</span><div className="evidence-sub"><strong>sub-PLO {item.code}</strong><small>{item.course} · {item.method}</small></div><div className="evidence-score"><strong>{item.score.toFixed(2)}</strong><span>ระดับสมรรถนะ</span></div><PloBadge status={item.verdict === "ผ่าน" ? "achieved" : "not_achieved"} compact /><Button variant="ghost" size="icon" aria-label="ดูรายละเอียดหลักฐาน"><Eye size={16} /></Button></div>)}</div><div className="verdict-actions"><Button variant="outline"><FileText size={16} />เปิดคะแนนดิบและหลักฐาน</Button><Button><RotateCcw size={16} />สร้างแผนซ่อมเสริม</Button></div></> : <div className="closed-evidence"><FileText size={22} /><div><strong>{studentId ? "เส้นทางหลักฐานจาก Supabase" : `เปิดดูเส้นทางหลักฐานของ ${plo.code}`}</strong><p>{studentId ? "ผล PLO นี้อ่านจาก plo_achievement; รายละเอียดคะแนนและไฟล์หลักฐานจะแสดงเมื่อมีระเบียน evidence ที่เชื่อมกัน" : "จะแสดง sub-PLO จุดวัด M/P คะแนนล่าสุด และหลักฐานที่สัมพันธ์กัน"}</p></div></div>}</div>}</CardContent></Card>)}</section>
  </div>;
}
