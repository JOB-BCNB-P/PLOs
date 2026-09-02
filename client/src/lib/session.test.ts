import { describe, expect, it } from "vitest";
import { viewsForRole, viewsForRoles } from "@/components/AppShell";
import { ROLE_LABEL, isStaffRole, primaryRole } from "./session";

describe("role-based navigation", () => {
  it("limits students to their own record and the curriculum structure", () => {
    expect(viewsForRole("student")).toEqual(["student", "curriculum"]);
    expect(viewsForRole("student")).not.toContain("admin");
    expect(viewsForRole("student")).not.toContain("cohort");
  });

  it("keeps the admin panel for administrators only", () => {
    expect(viewsForRole("admin")).toContain("admin");
    (["executive", "academic_affairs", "program_chair", "class_advisor", "lecturer"] as const).forEach((role) => {
      expect(viewsForRole(role)).not.toContain("admin");
      expect(viewsForRole(role)).toContain("overview");
    });
  });

  it("labels every role in Thai and separates staff from students", () => {
    (Object.keys(ROLE_LABEL) as Array<keyof typeof ROLE_LABEL>).forEach((role) => {
      expect(ROLE_LABEL[role].length).toBeGreaterThan(0);
    });
    expect(isStaffRole("student")).toBe(false);
    expect(isStaffRole("lecturer")).toBe(true);
  });
});

describe("users holding several roles", () => {
  it("grants the union of every role's menus", () => {
    expect(viewsForRoles(["executive", "program_chair", "lecturer"])).toEqual(["overview", "student", "year", "cohort", "curriculum"]);
    expect(viewsForRoles(["lecturer", "admin"])).toContain("admin");
  });

  it("does not shrink a staff member's menu because they are also a student", () => {
    expect(viewsForRoles(["student", "lecturer"])).toContain("overview");
    expect(viewsForRoles(["student"])).not.toContain("overview");
  });

  it("shows the widest role on screen but keeps every role for permissions", () => {
    expect(primaryRole(["lecturer", "program_chair"])).toBe("program_chair");
    expect(primaryRole(["lecturer", "admin", "class_advisor"])).toBe("admin");
    expect(primaryRole([])).toBe("student");
  });
});
