import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jsonToSheet: vi.fn(() => ({ "!cols": [] })),
  bookNew: vi.fn(() => ({})),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
  pdfHtml: vi.fn(),
  pdfSave: vi.fn(),
}));
vi.mock("xlsx", () => ({ utils: { json_to_sheet: mocks.jsonToSheet, book_new: mocks.bookNew, book_append_sheet: mocks.bookAppendSheet }, writeFile: mocks.writeFile }));
vi.mock("jspdf", () => ({ default: vi.fn(() => ({ html: mocks.pdfHtml, save: mocks.pdfSave })) }));

import { exportAssessmentExcel, exportAssessmentPdf } from "./report-utils";

const row = { studentCode: "S01", studentName: "นักศึกษา", yearLevel: 2, plo: "PLO2", value: 3.75, status: "ผ่าน", term: "2568/1", reason: "ผ่านทุก sub-PLO", sourceEvidence: "NU44110 · rubric" };

describe("assessment report export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("document", { createElement: vi.fn(() => ({ style: {}, innerHTML: "", remove: vi.fn() })), body: { appendChild: vi.fn() } });
  });
  it("maps traceable assessment fields into an Excel workbook", () => {
    exportAssessmentExcel([row], "รายงาน PLO");
    expect(mocks.jsonToSheet).toHaveBeenCalledWith([expect.objectContaining({ "Student Code": "S01", PLO: "PLO2", "Source Evidence": "NU44110 · rubric" })]);
    expect(mocks.bookAppendSheet).toHaveBeenCalled();
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.anything(), "รายงาน-PLO.xlsx");
  });
  it("renders a Thai PDF document and saves it after html conversion", () => {
    mocks.pdfHtml.mockImplementation((_wrapper, options: { callback: (doc: unknown) => void }) => options.callback({ save: mocks.pdfSave }));
    exportAssessmentPdf([row], "รายงาน PLO");
    expect(mocks.pdfHtml).toHaveBeenCalled();
    expect(mocks.pdfSave).toHaveBeenCalledWith("รายงาน-PLO.pdf");
  });
});
