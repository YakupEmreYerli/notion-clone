import { expect, type Locator } from "@playwright/test";

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type ClippingFinding = {
  ancestor: string;
  property: string;
  value: string;
  elementRect: Rect;
  clipRect: Rect;
};

export type ClippingOptions = {
  includeShadow?: boolean;
  tolerance?: number;
};

/**
 * Verifies a surface that is expected to be fully visible. Completely
 * off-screen children of a normal scrollport are ignored; partially visible
 * surfaces are failures and identify the exact clipping ancestor/property.
 */
export async function assertNoUnexpectedClipping(
  locator: Locator,
  options: ClippingOptions = {},
) {
  await expect(locator).toBeAttached();

  const findings = await locator.evaluate(
    (element, { includeShadow, tolerance }) => {
      const rectToObject = (rect: DOMRect): Rect => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      });
      const describe = (node: Element) => {
        const id = node.id ? `#${node.id}` : "";
        const classes = [...node.classList]
          .slice(0, 3)
          .map((name) => `.${name}`)
          .join("");
        return `${node.tagName.toLowerCase()}${id}${classes}`;
      };
      const splitShadows = (value: string) => {
        const shadows: string[] = [];
        let depth = 0;
        let start = 0;
        for (let index = 0; index < value.length; index += 1) {
          if (value[index] === "(") depth += 1;
          if (value[index] === ")") depth -= 1;
          if (value[index] === "," && depth === 0) {
            shadows.push(value.slice(start, index));
            start = index + 1;
          }
        }
        shadows.push(value.slice(start));
        return shadows;
      };
      const shadowRect = (rect: Rect, boxShadow: string): Rect => {
        if (!includeShadow || boxShadow === "none") return rect;
        let leftBleed = 0;
        let rightBleed = 0;
        let topBleed = 0;
        let bottomBleed = 0;
        for (const shadow of splitShadows(boxShadow)) {
          const withoutColors = shadow.replace(/(?:rgba?|hsla?)\([^)]*\)/g, "");
          const values = [...withoutColors.matchAll(/(-?\d*\.?\d+)px/g)].map(
            (match) => Number(match[1]),
          );
          const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = values;
          leftBleed = Math.max(leftBleed, blur + spread - offsetX);
          rightBleed = Math.max(rightBleed, blur + spread + offsetX);
          topBleed = Math.max(topBleed, blur + spread - offsetY);
          bottomBleed = Math.max(bottomBleed, blur + spread + offsetY);
        }
        return {
          left: rect.left - Math.max(0, leftBleed),
          top: rect.top - Math.max(0, topBleed),
          right: rect.right + Math.max(0, rightBleed),
          bottom: rect.bottom + Math.max(0, bottomBleed),
        };
      };

      const ownStyle = getComputedStyle(element);
      const elementRect = shadowRect(
        rectToObject(element.getBoundingClientRect()),
        ownStyle.boxShadow,
      );
      const results: ClippingFinding[] = [];
      let ancestor = element.parentElement;

      while (ancestor) {
        const style = getComputedStyle(ancestor);
        const ancestorRect = rectToObject(ancestor.getBoundingClientRect());
        const axes = [
          ["overflow-x", style.overflowX, "left", "right"],
          ["overflow-y", style.overflowY, "top", "bottom"],
        ] as const;

        for (const [property, value, start, end] of axes) {
          if (!["hidden", "clip", "auto", "scroll"].includes(value)) continue;

          // Content completely outside an auto/scroll viewport is ordinary
          // scrolling, not a partially clipped visible surface.
          const intersects =
            elementRect[end] > ancestorRect[start] + tolerance &&
            elementRect[start] < ancestorRect[end] - tolerance;
          if (!intersects && (value === "auto" || value === "scroll")) continue;

          if (
            elementRect[start] < ancestorRect[start] - tolerance ||
            elementRect[end] > ancestorRect[end] + tolerance
          ) {
            results.push({
              ancestor: describe(ancestor),
              property,
              value,
              elementRect,
              clipRect: ancestorRect,
            });
          }
        }

        if (style.contain.split(" ").includes("paint")) {
          const exceeds =
            elementRect.left < ancestorRect.left - tolerance ||
            elementRect.right > ancestorRect.right + tolerance ||
            elementRect.top < ancestorRect.top - tolerance ||
            elementRect.bottom > ancestorRect.bottom + tolerance;
          if (exceeds) {
            results.push({
              ancestor: describe(ancestor),
              property: "contain",
              value: style.contain,
              elementRect,
              clipRect: ancestorRect,
            });
          }
        }

        ancestor = ancestor.parentElement;
      }
      return results;
    },
    {
      includeShadow: options.includeShadow ?? false,
      tolerance: options.tolerance ?? 0.5,
    },
  );

  expect(
    findings,
    findings.length
      ? `Unexpected clipping:\n${findings
          .map(
            (finding) =>
              `${finding.ancestor} clips via ${finding.property}: ${finding.value}\n` +
              `element=${JSON.stringify(finding.elementRect)}\n` +
              `clip=${JSON.stringify(finding.clipRect)}`,
          )
          .join("\n")}`
      : undefined,
  ).toEqual([]);
}
