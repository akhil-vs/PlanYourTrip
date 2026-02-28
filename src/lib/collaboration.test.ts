import { describe, expect, it } from "vitest";
import { buildSimplePdf } from "./pdf";
import { canEditTrip, canManageTrip, canViewTrip } from "./tripRoles";

describe("trip role guards", () => {
  it("allows viewers to view but not edit/manage", () => {
    expect(canViewTrip("VIEWER")).toBe(true);
    expect(canEditTrip("VIEWER")).toBe(false);
    expect(canManageTrip("VIEWER")).toBe(false);
  });

  it("allows editors to edit but not manage", () => {
    expect(canViewTrip("EDITOR")).toBe(true);
    expect(canEditTrip("EDITOR")).toBe(true);
    expect(canManageTrip("EDITOR")).toBe(false);
  });

  it("allows owners to manage", () => {
    expect(canViewTrip("OWNER")).toBe(true);
    expect(canEditTrip("OWNER")).toBe(true);
    expect(canManageTrip("OWNER")).toBe(true);
  });
});

describe("pdf export renderer", () => {
  it("returns valid PDF bytes and content header", () => {
    const buffer = buildSimplePdf("Trip Export", ["Line 1", "Line 2"]);
    expect(buffer.length).toBeGreaterThan(64);
    expect(buffer.subarray(0, 8).toString("utf8")).toContain("%PDF-1.4");
  });
});
