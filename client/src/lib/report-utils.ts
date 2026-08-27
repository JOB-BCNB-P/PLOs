import jsPDF from "jspdf";
import * as XLSX from "xlsx";

export type AssessmentReportRow = {
  studentCode: string;
  studentName: string;
  yearLevel: number | string;
  plo: string;
  value: number | null;
  status: string;
  term: string;
  reason?: string;
  sourceEvidence?: string;
};

const safeFileName = (value: string) => value.trim().replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "plo-report";

export function exportAssessmentExcel(rows: AssessmentReportRow[], fileName = "plo-assessment-report") {
  const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
    "Student Code": row.studentCode,
    "Student Name": row.studentName,
    "Year Level": row.yearLevel,
    PLO: row.plo,
    "Computed Value": row.value ?? "Pending",
    Status: row.status,
    Term: row.term,
    Reason: row.reason ?? "",
    "Source Evidence": row.sourceEvidence ?? "Not attached",
  })));
  worksheet["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 56 }, { wch: 28 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "PLO Results");
  XLSX.writeFile(workbook, `${safeFileName(fileName)}.xlsx`);
}

export function exportAssessmentPdf(rows: AssessmentReportRow[], fileName = "plo-assessment-report") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-10000px;top:0;width:1000px;padding:24px;background:#fff;color:#12203a;font-family:Arial,'Noto Sans Thai',sans-serif;font-size:12px;line-height:1.45";
  wrapper.innerHTML = `<h1 style="margin:0 0 4px;font-size:24px">รายงานผลการประเมิน PLOs</h1><p style="margin:0 0 16px;color:#53627b">สร้างเมื่อ ${new Date().toLocaleString("th-TH")} · แหล่งข้อมูล: ผลประเมินและหลักฐานที่ได้รับอนุญาต</p><table style="width:100%;border-collapse:collapse"><thead><tr>${["รหัสนักศึกษา","ชื่อ","ชั้นปี","PLO","ค่า","สถานะ","ภาคเรียน","เหตุผล/ที่มา","หลักฐาน"].map((header) => `<th style="text-align:left;border-bottom:2px solid #315fb8;padding:8px 5px">${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${[row.studentCode,row.studentName,row.yearLevel,row.plo,row.value == null ? "รอผล" : row.value.toFixed(2),row.status,row.term,row.reason ?? "-",row.sourceEvidence ?? "ไม่ได้แนบ"].map((value) => `<td style="border-bottom:1px solid #d8e0ee;padding:7px 5px;vertical-align:top">${String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char] ?? char))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  document.body.appendChild(wrapper);
  doc.html(wrapper, { x: 10, y: 10, width: 277, windowWidth: 1000, autoPaging: "text", callback: (finishedDoc) => { finishedDoc.save(`${safeFileName(fileName)}.pdf`); wrapper.remove(); } });
}
