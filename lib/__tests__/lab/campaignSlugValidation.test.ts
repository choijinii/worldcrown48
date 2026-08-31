import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_SLUG_MAX,
  campaignForTournament,
  normalizeCampaignSlug,
  validateCampaignSlug,
} from "@/lib/lab/campaignSlugValidation";

/**
 * UTM_RULES v1.0 §2 naming rules (marketing/00_strategy/UTM_RULES_v1.0.md):
 * lowercase letters·digits·underscore only, `_` as the single word separator.
 */
describe("normalizeCampaignSlug", () => {
  it("lowercases and keeps a compliant slug unchanged", () => {
    expect(normalizeCampaignSlug("best_stage_48")).toBe("best_stage_48");
    expect(normalizeCampaignSlug("Best_Stage_48")).toBe("best_stage_48");
  });

  it("turns spaces, hyphens and dots into single underscores", () => {
    expect(normalizeCampaignSlug("Best Stage 48")).toBe("best_stage_48");
    expect(normalizeCampaignSlug("best-stage-48")).toBe("best_stage_48");
    expect(normalizeCampaignSlug("best - stage . 48")).toBe("best_stage_48");
  });

  it("drops Korean, punctuation and other disallowed characters", () => {
    expect(normalizeCampaignSlug("최고의 무대 48")).toBe("48");
    expect(normalizeCampaignSlug("gen4_idol_48!")).toBe("gen4_idol_48");
    expect(normalizeCampaignSlug("cover/creator")).toBe("covercreator");
  });

  it("trims leading/trailing underscores and collapses runs", () => {
    expect(normalizeCampaignSlug("__a___b__")).toBe("a_b");
    expect(normalizeCampaignSlug("   ")).toBe("");
  });

  it("caps at CAMPAIGN_SLUG_MAX and is idempotent", () => {
    const long = "a".repeat(CAMPAIGN_SLUG_MAX + 10);
    const once = normalizeCampaignSlug(long);
    expect(once).toHaveLength(CAMPAIGN_SLUG_MAX);
    expect(normalizeCampaignSlug(once)).toBe(once);
    expect(normalizeCampaignSlug(normalizeCampaignSlug("Hello World-2026"))).toBe(
      normalizeCampaignSlug("Hello World-2026"),
    );
  });
});

describe("validateCampaignSlug", () => {
  it("treats empty as valid (optional field)", () => {
    expect(validateCampaignSlug("")).toEqual({ value: "", isEmpty: true, isValid: true });
    expect(validateCampaignSlug("   ").isValid).toBe(true);
  });

  it("accepts canonical slugs and rejects anything not yet normalized", () => {
    expect(validateCampaignSlug("perform_idol_48").isValid).toBe(true);
    expect(validateCampaignSlug("Perform_Idol_48").isValid).toBe(false);
    expect(validateCampaignSlug("perform idol").isValid).toBe(false);
    expect(validateCampaignSlug("_leading").isValid).toBe(false);
  });
});

describe("campaignForTournament (utm_campaign source of truth)", () => {
  it("uses the host-set slug when present", () => {
    expect(campaignForTournament({ id: "FbzCreuLSW4l7u0VUsKs", campaignSlug: "best_stage_48" })).toBe(
      "best_stage_48",
    );
  });

  it("falls back to the lowercased Tournament id — Firestore auto-ids are mixed-case, UTM is case-sensitive", () => {
    expect(campaignForTournament({ id: "FbzCreuLSW4l7u0VUsKs" })).toBe("fbzcreulsw4l7u0vusks");
    expect(campaignForTournament({ id: "admin-preview-3", campaignSlug: "" })).toBe("admin_preview_3");
  });

  it("returns 'site' for shares made outside any Tournament (UTM_RULES §1)", () => {
    expect(campaignForTournament(null)).toBe("site");
    expect(campaignForTournament(undefined)).toBe("site");
  });
});
