/** Clinical Aurora: หน้าโครงสร้างหลักสูตรอ่านจาก Supabase จริง — PLO, sub-PLO, รายวิชา และ Curriculum Mapping I/R/M/P */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleAlert, ClipboardCheck, GitCompareArrows, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EvidenceSpine from "@/components/EvidenceSpine";
import { listCurricula, loadCurriculumStructure, type CurriculumOption, type CurriculumStructure } from "@/lib/curriculum-data";

const STATUS_LABEL: Record<string, string> = {
  draft: "ร่าง",
  proposed: "เสนอพิจารณา",
  approved: "อนุมัติแล้ว",
  active: "ใช้งานจริง",
  archived: "จัดเก็บ",
};

export default function CurriculumView() {
  const [curricula, setCurricula] = useState<CurriculumOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [structure, setStructure] = useState<CurriculumStructure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listCurricula().then((result) => {
      if (cancelled) return;
      setCurricula(result.data);
      const active = result.data.find((item) => item.status === "active") ?? result.data[0];
      setSelectedId(active?.id ?? "");
      if (!active) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => curricula.find((item) => item.id === selectedId), [curricula, selectedId]);

  const refresh = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    const result = await loadCurriculumStructure(selected);
    setStructure(result);
    setLoading(false);
  }, [selected]);

  useEffect(() => { void refresh(); }, [refresh]);

  const subPloCount = structure?.plos.reduce((sum, plo) => sum + plo.subPlos.length, 0) ?? 0;
  const gapCount = (structure?.unmappedSubPlos.length ?? 0) + (structure?.subPlosWithoutDecisionPoint.length ?? 0);
  const isDraft = Boolean(selected && selected.status !== "active");

  return <div className="curriculum-view">
    <section className="page-lead curriculum-lead">
      <div className="lead-copy">
        <p className="eyebrow">CURRICULUM STRUCTURE · LIVE</p>
        <h1>โครงสร้างที่<br /><em>เปลี่ยนเป็นหลักฐาน</em></h1>
        <p>PLO, sub-PLO, รายวิชา และ Curriculum Mapping อ่านจากฐานข้อมูลจริงของหลักสูตร แยกตามเวอร์ชันอย่างชัดเจน</p>
      </div>
      <div className="curriculum-select">
        <span>เวอร์ชันหลักสูตร</span>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger>
          <SelectContent>
            {curricula.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                พ.ศ. {item.version} · {STATUS_LABEL[item.status] ?? item.status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <small>
          <span className="live-dot" />
          {loading ? "กำลังโหลดจากฐานข้อมูล" : structure?.status === "live" ? "ข้อมูลจริงจาก Supabase" : "ยังไม่มีข้อมูลในหลักสูตรนี้"}
        </small>
      </div>
    </section>

    <EvidenceSpine items={[{ label: "PLO", detail: "ผลลัพธ์หลักสูตร" }, { label: "sub-PLO", detail: "ผลลัพธ์ย่อย" }, { label: "I/R/M/P", detail: "Curriculum Mapping" }, { label: "จุดตัดสิน", detail: "M/P ที่ใช้ตัดสินผล" }]} active={2} />

    {structure?.status === "error" && <Card className="gap-card"><CardContent>
      <div className="gap-mark"><CircleAlert size={21} /></div>
      <p className="section-kicker">CONNECTION</p>
      <h2>อ่านข้อมูลหลักสูตรไม่สำเร็จ</h2>
      <p>{structure.message ?? "ตรวจสอบการเชื่อมต่อ Supabase และสิทธิ์ RLS ของบัญชีที่ใช้งาน"}</p>
      <Button className="wide-action" onClick={() => void refresh()}><RefreshCw size={15} />ลองใหม่</Button>
    </CardContent></Card>}

    {structure?.status !== "error" && <>
      <section className="curriculum-summary">
        <Card><CardContent>
          <span className="summary-icon"><ClipboardCheck size={19} /></span>
          <div><strong>{structure?.plos.length ?? 0} PLOs</strong><small>{subPloCount} sub-PLO ตามเล่มหลักสูตร</small></div>
        </CardContent></Card>
        <Card><CardContent>
          <span className="summary-icon violet"><GitCompareArrows size={19} /></span>
          <div><strong>{structure?.courseCount ?? 0} รายวิชา</strong><small>{structure?.mappingCount ?? 0} จุด mapping · {structure?.totalCredits ?? 0} หน่วยกิตบังคับ</small></div>
        </CardContent></Card>
        <Card><CardContent>
          <span className={`summary-icon ${gapCount ? "coral" : ""}`}>{gapCount ? <CircleAlert size={19} /> : <Check size={19} />}</span>
          <div><strong>{gapCount} ช่องว่าง</strong><small>{gapCount ? "sub-PLO ที่ยังตัดสินผลไม่ได้" : "ทุก sub-PLO มีจุดตัดสิน M/P"}</small></div>
        </CardContent></Card>
      </section>

      <section className="curriculum-grid">
        <Card className="plo-structure"><CardContent>
          <div className="card-heading">
            <div><p className="section-kicker">OUTCOME STRUCTURE</p><h2>PLOs และความครอบคลุมของรายวิชา</h2></div>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}รีเฟรช
            </Button>
          </div>

          {loading && !structure && <p className="muted-copy">กำลังโหลดโครงสร้างหลักสูตร…</p>}
          {!loading && structure?.plos.length === 0 && <p className="muted-copy">ยังไม่มี PLO ในหลักสูตรนี้ — นำเข้าข้อมูลหลักสูตรก่อนใช้งานหน้าจอนี้</p>}

          <div className="plo-outline">
            {structure?.plos.map((plo, index) => {
              const weakSubPlos = plo.subPlos.filter((sub) => sub.courses === 0 || !sub.levels.some((level) => level === "M" || level === "P")).length;
              return <button key={plo.id} className="plo-outline-row" title={plo.description}>
                <span className="outline-number">{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{plo.code}</strong><small>{plo.description}</small></div>
                <span className="course-count">{plo.subPlos.length} sub-PLO · {plo.courses} รายวิชา</span>
                {weakSubPlos ? <CircleAlert size={16} className="gap-icon" /> : <Check size={16} className="covered-icon" />}
                <ChevronRight size={16} />
              </button>;
            })}
          </div>
        </CardContent></Card>

        <Card className="gap-card"><CardContent>
          <div className="gap-mark">{gapCount ? <CircleAlert size={21} /> : <Check size={21} />}</div>
          <p className="section-kicker">MAPPING HEALTH</p>
          <h2>{gapCount ? "พบช่องว่างที่ควรทบทวน" : "Mapping ครบทุก sub-PLO"}</h2>
          <p>
            {gapCount
              ? "ระบบตัดสินผลจากระดับ Mastery และ Practice เท่านั้น sub-PLO ที่ยังไม่มีจุดดังกล่าวจึงยังสรุปผลการบรรลุระดับหลักสูตรไม่ได้"
              : "ทุก sub-PLO มีรายวิชารับผิดชอบและมีจุด M หรือ P อย่างน้อยหนึ่งจุด จึงตัดสินผลระดับหลักสูตรได้"}
          </p>
          {structure?.unmappedSubPlos.map((sub) => (
            <div className="gap-item" key={sub.id}><span>sub-PLO {sub.code}</span><strong>ยังไม่มีรายวิชารับผิดชอบ</strong></div>
          ))}
          {structure?.subPlosWithoutDecisionPoint.map((sub) => (
            <div className="gap-item" key={sub.id}><span>sub-PLO {sub.code}</span><strong>ขาดจุด M/P ({sub.levels.join(", ") || "ไม่มีระดับ"})</strong></div>
          ))}
        </CardContent></Card>
      </section>

      {isDraft && selected && <Card className="draft-banner"><CardContent>
        <div className="draft-icon"><LockKeyhole size={20} /></div>
        <div>
          <strong>หลักสูตร พ.ศ. {selected.version} อยู่ในสถานะ{STATUS_LABEL[selected.status] ?? selected.status}</strong>
          <p>แก้ไข PLO/sub-PLO/รายวิชา และ Mapping ได้ แต่ระบบล็อกไม่ให้ใช้ตัดสินผลจริงจนกว่าจะเปลี่ยนสถานะเป็นใช้งานจริง</p>
        </div>
      </CardContent></Card>}
    </>}
  </div>;
}
