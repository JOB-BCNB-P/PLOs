import { describe, expect, it } from "vitest";
import { getAuthRedirectUrl } from "./supabase";

describe("getAuthRedirectUrl", () => {
  it("keeps the GitHub Pages repository base path", () => {
    expect(getAuthRedirectUrl("https://job-bcnb-p.github.io", "/PLOs/")).toBe("https://job-bcnb-p.github.io/PLOs/");
  });
  it("supports local development origin", () => {
    expect(getAuthRedirectUrl("http://localhost:5173", "/")).toBe("http://localhost:5173/");
  });
});
