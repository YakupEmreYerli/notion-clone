import { describe, expect, it } from "vitest";

import { resolveRootDestination } from "@/lib/auth-routing";

describe("resolveRootDestination", () => {
  it("sends a signed-in user into the app", () => {
    expect(
      resolveRootDestination({ hasSession: true, hasAnyUser: true }),
    ).toBe("/documents");
  });

  it("sends a visitor to the login page when an account already exists", () => {
    expect(
      resolveRootDestination({ hasSession: false, hasAnyUser: true }),
    ).toBe("/login");
  });

  it("sends a visitor to first-run setup when no account exists yet", () => {
    expect(
      resolveRootDestination({ hasSession: false, hasAnyUser: false }),
    ).toBe("/register");
  });

  it("prefers an existing session over the empty-install branch", () => {
    // Oturum var ama kullanıcı sayımı boş dönerse (yarış durumu / okuma
    // hatası) kullanıcı kurulum ekranına DÜŞMEMELİ.
    expect(
      resolveRootDestination({ hasSession: true, hasAnyUser: false }),
    ).toBe("/documents");
  });
});
