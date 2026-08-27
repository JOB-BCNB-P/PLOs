import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAssessmentExcel, exportAssessmentPdf, type AssessmentReportRow } from "@/lib/report-utils";

export default function ReportActions({ rows, fileName }: { rows: AssessmentReportRow[]; fileName: string }) {
  return <div className="report-actions" aria-label="ส่งออกรายงาน">
    <Button variant="outline" onClick={() => exportAssessmentPdf(rows, fileName)}><FileText size={16} /> PDF</Button>
    <Button variant="outline" onClick={() => exportAssessmentExcel(rows, fileName)}><FileSpreadsheet size={16} /> Excel</Button>
  </div>;
}

export function ReportDownloadButton({ rows, fileName }: { rows: AssessmentReportRow[]; fileName: string }) {
  return <Button variant="outline" className="export-btn" onClick={() => exportAssessmentExcel(rows, fileName)}><Download size={16} />ส่งออก Excel</Button>;
}
