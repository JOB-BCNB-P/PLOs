import { useCallback, useEffect, useState } from "react";
import { Download, Eye, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type EvidenceRow = {
  id: string;
  ref_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  uploaded_at: string;
};

type Props = { studentId?: string };

export default function EvidenceHistory({ studentId }: Props) {
  const [items, setItems] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!studentId) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: scores, error: scoreError } = await supabase
        .from("scores")
        .select("id")
        .eq("student_id", studentId)
        .limit(200);
      if (scoreError) throw scoreError;
      const scoreIds = (scores ?? []).map((score) => score.id);
      if (scoreIds.length === 0) {
        setItems([]);
        return;
      }
      const { data, error: evidenceError } = await supabase
        .from("evidence")
        .select("id,ref_id,file_path,file_name,mime_type,uploaded_at")
        .eq("ref_type", "score")
        .in("ref_id", scoreIds)
        .order("uploaded_at", { ascending: false })
        .limit(100);
      if (evidenceError) throw evidenceError;
      setItems((data ?? []) as EvidenceRow[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถโหลดประวัติหลักฐานได้");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const openFile = async (item: EvidenceRow, download = false) => {
    setWorkingId(item.id);
    try {
      const { data, error: signedError } = await supabase.storage.from("plo-evidence").createSignedUrl(item.file_path, 120);
      if (signedError || !data?.signedUrl) throw signedError ?? new Error("ไม่สามารถสร้างลิงก์หลักฐานได้");
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = data.signedUrl;
        anchor.download = item.file_name;
        anchor.target = "_blank";
        anchor.click();
      } else {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "ไม่สามารถเปิดไฟล์หลักฐานได้");
    } finally {
      setWorkingId(null);
    }
  };

  const removeFile = async (item: EvidenceRow) => {
    if (!window.confirm(`ยืนยันการลบหลักฐาน “${item.file_name}” หรือไม่`)) return;
    setWorkingId(item.id);
    try {
      const { error: storageError } = await supabase.storage.from("plo-evidence").remove([item.file_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from("evidence").delete().eq("id", item.id);
      if (rowError) throw rowError;
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("ลบหลักฐานเรียบร้อย");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "ไม่สามารถลบหลักฐานได้ตามสิทธิ์ของบัญชีนี้");
    } finally {
      setWorkingId(null);
    }
  };

  return <Card className="evidence-history-card"><CardContent>
    <div className="card-heading"><div><p className="section-kicker">EVIDENCE HISTORY</p><h2>ประวัติไฟล์หลักฐาน</h2><p className="chart-subtitle">ตรวจสอบไฟล์ที่ผูกกับผลประเมินของนักศึกษาที่เลือก</p></div><Button variant="ghost" onClick={() => void load()} disabled={loading || !studentId}>{loading ? <Loader2 className="spin" size={16} /> : "รีเฟรช"}</Button></div>
    {!studentId && <div className="history-empty"><FileText size={20} />เลือกนักศึกษาเพื่อดูประวัติหลักฐาน</div>}
    {studentId && loading && <div className="history-empty"><Loader2 className="spin" size={20} />กำลังโหลดประวัติหลักฐาน…</div>}
    {studentId && !loading && error && <div className="validation-alert" role="alert"><FileText size={17} /><p>{error}</p></div>}
    {studentId && !loading && !error && items.length === 0 && <div className="history-empty"><FileText size={20} />ยังไม่มีไฟล์หลักฐานสำหรับนักศึกษารายนี้</div>}
    {items.length > 0 && <div className="evidence-history-list">{items.map((item) => <div className="evidence-history-row" key={item.id}><div className="history-file-icon"><FileText size={17} /></div><div className="history-file-copy"><strong>{item.file_name}</strong><span>{item.mime_type ?? "ไม่ระบุชนิดไฟล์"} · {new Date(item.uploaded_at).toLocaleString("th-TH")}</span></div><div className="history-actions"><Button variant="ghost" size="icon" aria-label={`เปิด ${item.file_name}`} disabled={workingId === item.id} onClick={() => void openFile(item)}>{workingId === item.id ? <Loader2 className="spin" size={16} /> : <Eye size={16} />}</Button><Button variant="ghost" size="icon" aria-label={`ดาวน์โหลด ${item.file_name}`} disabled={workingId === item.id} onClick={() => void openFile(item, true)}><Download size={16} /></Button><Button variant="ghost" size="icon" aria-label={`ลบ ${item.file_name}`} disabled={workingId === item.id} onClick={() => void removeFile(item)}><Trash2 size={16} /></Button></div></div>)}</div>}
  </CardContent></Card>;
}
