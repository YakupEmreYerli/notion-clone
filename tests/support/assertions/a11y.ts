import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * axe-core ile WCAG 2.1 A/AA taraması.
 *
 * Karşılaştırma **kural kimliği** üzerinden yapılır, seçici üzerinden değil:
 * Radix üretilmiş id'ler (`#radix-_r_l_-trigger-gallery`) her koşuda değişir,
 * seçiciyi beklentiye yazmak testi kırılgan yapardı. Nerede olduğu bilgisi
 * kaybolmasın diye başarısızlık mesajına tam liste iliştirilir.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface A11yOptions {
  /** Yalnızca bu seçicinin altını tara (ör. açık bir modal). */
  include?: string;
}

export async function scanA11y(page: Page, { include }: A11yOptions = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);

  const { violations } = await builder.analyze();
  return {
    /** Benzersiz, sıralı kural kimlikleri — beklentiyle karşılaştırılan değer. */
    ruleIds: [...new Set(violations.map((violation) => violation.id))].sort(),
    /** İnsan okuması için: kural, etki ve ilk düğümün seçicisi. */
    detail: violations
      .map(
        (violation) =>
          `  ${violation.id} (${violation.impact}) — ${violation.nodes[0]?.target.join(" ")}`,
      )
      .join("\n"),
  };
}

/**
 * Taranan yüzeyin ihlal kümesinin **tam olarak** beklenen liste olmasını ister.
 *
 * Eşitlik (alt küme değil) bilinçli: yeni bir ihlal girerse test kırılır,
 * bilinen bir ihlal düzeltilirse de kırılır — böylece liste kendiliğinden
 * çürümez, düzeltme listeden silinmeye zorlar.
 */
export async function expectA11yViolations(
  page: Page,
  expected: string[],
  options?: A11yOptions,
) {
  const { ruleIds, detail } = await scanA11y(page, options);
  expect(
    ruleIds,
    detail ? `axe ihlalleri:\n${detail}` : "axe hiç ihlal bulmadı",
  ).toEqual([...expected].sort());
}
