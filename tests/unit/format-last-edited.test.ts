import { describe, expect, it } from "vitest";

import { formatLastEdited } from "@/lib/utils";

const at = (iso: string) => new Date(iso).getTime();

describe("formatLastEdited", () => {
  it("aynı gün ise 'Today at <saat>' der", () => {
    expect(
      formatLastEdited(at("2026-08-25T17:57:00"), at("2026-08-25T23:10:00")),
    ).toBe("Today at 5:57 PM");
  });

  it("bir önceki takvim günü ise 'Yesterday' der", () => {
    expect(
      formatLastEdited(at("2026-08-24T23:59:00"), at("2026-08-25T00:01:00")),
    ).toBe("Yesterday at 11:59 PM");
  });

  it("daha eskisi için tam tarih verir", () => {
    expect(
      formatLastEdited(at("2026-03-04T09:05:00"), at("2026-08-25T12:00:00")),
    ).toBe("Mar 4, 2026 at 9:05 AM");
  });

  it("gün farkı saat farkıyla değil TAKVİM günüyle hesaplanır", () => {
    // 3 saat arayla ama iki ayrı gün — "Today" DEĞİL.
    expect(
      formatLastEdited(at("2026-08-24T23:00:00"), at("2026-08-25T02:00:00")),
    ).toBe("Yesterday at 11:00 PM");
  });
});
