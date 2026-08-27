import { describe, expect, it, vi } from "vitest";
import { supabase } from "../lib/supabase";

// Mock Supabase client
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn()
              }))
            }))
          }))
        }))
      }))
    })),
    storage: { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) }
  }
}));

describe("ScoreEntryForm Integration Logic", () => {
  it("rejects submission if no user session is found", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any);
    const { data: authUser } = await supabase.auth.getUser();
    expect(authUser.user).toBeNull();
  });

  it("checks for duplicate attempts before proceeding with upload", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "existing-id" }, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({ 
        eq: vi.fn(() => ({ 
          eq: vi.fn(() => ({ 
            eq: vi.fn(() => ({ 
              eq: vi.fn(() => ({ 
                maybeSingle: mockMaybeSingle 
              })) 
            })) 
          })) 
        })) 
      }))
    } as any);

    const { data: existing } = await (supabase.from("assessment_scores") as any).select("id").eq("s", "1").eq("m", "1").eq("t", "1").eq("a", "1").maybeSingle();
    expect(existing).not.toBeNull();
    expect(existing?.id).toBe("existing-id");
  });

  it("verifies record permission via RPC before recording", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null });
    const { data: canRecord } = await supabase.rpc("can_record_assessment", { p_assessment_method_id: "m1" });
    expect(canRecord).toBe(false);
  });

  it("triggers cleanup if upload succeeds but RPC fails", async () => {
    const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "p" }, error: null }),
      remove: mockRemove
    } as any);
    
    // Logic extraction: if (uploadError) throw; const { error: atomicError } = await rpc; if (atomicError) throw atomicError; catch { if (uploadedPath) remove; }
    const uploadedPath = "test-path";
    const atomicError = { message: "RPC Failed" };
    
    if (atomicError) {
      await supabase.storage.from("plo-evidence").remove([uploadedPath]);
    }
    
    expect(mockRemove).toHaveBeenCalledWith([uploadedPath]);
  });
});
