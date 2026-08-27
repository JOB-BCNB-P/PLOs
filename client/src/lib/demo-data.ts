/** Clinical Aurora: non-production preview fixtures; no real student data is embedded in the client. */
import type { AchievementStatus } from "./achievement-engine";

export type PloSummary = { code: string; short: string; attainment: number; target: number; courses: number; status: AchievementStatus };

export const demoPlos: PloSummary[] = [
  { code: "PLO1", short: "ความรู้พยาบาล", attainment: 88, target: 80, courses: 7, status: "achieved" },
  { code: "PLO2", short: "ปฏิบัติแบบองค์รวม", attainment: 76, target: 80, courses: 8, status: "not_achieved" },
  { code: "PLO3", short: "จริยธรรมวิชาชีพ", attainment: 94, target: 80, courses: 5, status: "achieved" },
  { code: "PLO4", short: "คิดขั้นสูง", attainment: 83, target: 80, courses: 6, status: "achieved" },
  { code: "PLO5", short: "วิจัยและนวัตกรรม", attainment: 78, target: 80, courses: 4, status: "not_achieved" },
  { code: "PLO6", short: "ภาวะผู้นำ", attainment: 86, target: 80, courses: 5, status: "achieved" },
  { code: "PLO7", short: "การสื่อสาร", attainment: 91, target: 80, courses: 4, status: "achieved" },
  { code: "PLO8", short: "เทคโนโลยีดิจิทัล", attainment: 82, target: 80, courses: 3, status: "achieved" },
  { code: "PLO9", short: "ทักษะชีวิต", attainment: 89, target: 80, courses: 3, status: "achieved" },
  { code: "PLO10", short: "ผู้ประกอบการสุขภาพ", attainment: 74, target: 80, courses: 2, status: "pending" },
];

export const radarData = demoPlos.map((item, index) => ({ plo: item.code.replace("PLO", "P"), cohort2565: item.attainment, cohort2566: Math.max(60, item.attainment - 4 + (index % 3) * 3), target: item.target }));

export const trendData = [
  { term: "2566/1", attained: 71, pending: 18, target: 80 },
  { term: "2566/2", attained: 75, pending: 15, target: 80 },
  { term: "2567/1", attained: 78, pending: 14, target: 80 },
  { term: "2567/2", attained: 81, pending: 11, target: 80 },
  { term: "2568/1", attained: 82.4, pending: 9, target: 80 },
];

export const courseRows = [
  { code: "NU24101", name: "การพยาบาลผู้ใหญ่และผู้สูงอายุ 1", levels: ["I", "R", "", "", "", "", "", "", "", ""] },
  { code: "NU34103", name: "การพยาบาลมารดา ทารก และผดุงครรภ์", levels: ["", "M", "R", "", "", "", "", "", "", ""] },
  { code: "NU34107", name: "การพยาบาลสุขภาพจิตและจิตเวช", levels: ["", "P", "M", "R", "", "", "", "", "", ""] },
  { code: "NU44110", name: "ปฏิบัติการพยาบาลแบบบูรณาการ", levels: ["P", "P", "P", "P", "R", "M", "M", "M", "R", ""] },
];

export const demoStudent = {
  name: "นักศึกษาตัวอย่าง A.", studentCode: "65XXXX01", cohort: "2565", yearLevel: 4, curriculum: "หลักสูตรปรับปรุง พ.ศ. 2565", total: { achieved: 8, notAchieved: 1, pending: 1 },
  plos: [
    { code: "PLO1", title: "ประยุกต์ความรู้ทางการพยาบาล", status: "achieved" as AchievementStatus, value: 4.18, note: "ผ่านทุก sub-PLO และมีผล M/P ครบ" },
    { code: "PLO2", title: "ปฏิบัติการพยาบาลแบบองค์รวม", status: "not_achieved" as AchievementStatus, value: 3.12, note: "sub-PLO 2.1 ต่ำกว่าเกณฑ์ 3.51" },
    { code: "PLO3", title: "คุณธรรม จริยธรรม และจรรยาบรรณ", status: "achieved" as AchievementStatus, value: 4.62, note: "ผ่านทุกจุดวัดระดับ M/P" },
    { code: "PLO10", title: "ผู้ประกอบการด้านสุขภาพ", status: "pending" as AchievementStatus, value: null, note: "รอผล M/P จากรายวิชาบูรณาการ" },
  ],
  evidence: [
    { code: "2.1", score: 2.8, course: "NU44110", method: "Practical examination", verdict: "ไม่ผ่าน" },
    { code: "2.2", score: 4.14, course: "NU34103", method: "Clinical rubric", verdict: "ผ่าน" },
    { code: "2.3", score: 3.52, course: "NU44110", method: "Case presentation", verdict: "ผ่าน" },
  ],
};

export const demoUsers = [
  { name: "อาจารย์กุลธิดา ว.", email: "kulthida.w@bcn.ac.th", role: "Lecturer", edit: false, initials: "กว" },
  { name: "นายสุเมธ ป.", email: "sumet.p@bcn.ac.th", role: "Academic Affairs", edit: true, initials: "สป" },
  { name: "อาจารย์พิมพ์ใจ ร.", email: "pimjai.r@bcn.ac.th", role: "Class Advisor", edit: false, initials: "พร" },
];
