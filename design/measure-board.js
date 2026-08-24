/* Notion board measurement script (reusable).
 * Run inside the open Notion board page via browser_evaluate.
 * Expects: the page is on a board view (light or dark mode).
 * Output: JSON with measured values for the current state.
 */
(() => {
  const PICK_PROPS = [
    "display", "position", "width", "height", "minWidth", "maxWidth",
    "margin", "padding", "gap", "rowGap", "columnGap",
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
    "color", "backgroundColor", "backgroundImage",
    "border", "borderRadius", "boxShadow", "opacity",
    "transition", "transform", "overflow", "flex", "alignItems", "justifyContent", "zIndex"
  ];
  const pick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const o = { rect: { w: +r.width.toFixed(2), h: +r.height.toFixed(2), x: +r.x.toFixed(2), y: +r.y.toFixed(2) } };
    PICK_PROPS.forEach((p) => {
      const v = cs[p];
      if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "0px none") o[p] = v;
    });
    return o;
  };
  const txt = (el) => (el ? (el.textContent || "").trim().slice(0, 40) : null);

  const out = { meta: {}, scroller: null, boardView: null, columns: [], cards: [] };

  // --- Meta / theme ---
  const rootCs = getComputedStyle(document.documentElement);
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  out.meta.themeVars = {
    texPri: rootCs.getPropertyValue("--c-texPri").trim(),
    texSec: rootCs.getPropertyValue("--c-texSec").trim(),
    whiButBac: rootCs.getPropertyValue("--c-whiButBac").trim(),
    shaOutMd: rootCs.getPropertyValue("--c-shaOutMd").trim(),
    shaOutLg: rootCs.getPropertyValue("--c-shaOutLg").trim(),
    bodyBg
  };
  out.meta.boardUrl = location.href;
  out.meta.dpr = window.devicePixelRatio;

  // --- Scroller (horizontal board scroll container) ---
  const scroller = document.querySelector(".notion-scroller.vertical.horizontal") ||
    [...document.querySelectorAll("div")].find((d) => {
      const cs = getComputedStyle(d);
      return (cs.overflowX === "auto") && d.scrollWidth > d.clientWidth;
    });
  if (scroller) {
    out.scroller = pick(scroller);
    out.scroller.clientW = scroller.clientWidth;
    out.scroller.scrollW = scroller.scrollWidth;
    out.scroller.scrollbarH = null;
    // webkit scrollbar styles
    const sb = getComputedStyle(scroller, "::-webkit-scrollbar");
    out.scroller.scrollbarSize = { w: sb.width, h: sb.height };
    const sbThumb = getComputedStyle(scroller, "::-webkit-scrollbar-thumb");
    out.scroller.scrollbarThumb = { bg: sbThumb.backgroundColor, radius: sbThumb.borderRadius };
  }

  // --- Board view ---
  const view = document.querySelector(".notion-board-view");
  if (view) {
    out.boardView = pick(view);
    out.boardView.children = view.children.length;
  }

  // --- Columns ---
  const groups = [...document.querySelectorAll(".notion-board-group")];
  groups.forEach((g, gi) => {
    const col = { index: gi, rect: pick(g), header: null, cards: [] };
    // header row: the flex row containing the title text, height ~40
    const titleSpan = [...g.querySelectorAll("span")].find((s) => s.children.length === 0 && s.textContent.trim());
    const title = txt(titleSpan);
    col.groupKey = title;
    if (titleSpan) {
      // walk up to the header row (flex, pad 0 8px)
      let hdr = titleSpan;
      for (let i = 0; i < 6 && hdr; i++) {
        const cs = getComputedStyle(hdr);
        if (cs.display === "flex" && cs.alignItems === "center") break;
        hdr = hdr.parentElement;
      }
      if (hdr) {
        col.header = { ...pick(hdr), titleText: title };
        // the color badge (inline-flex with bg)
        let badge = titleSpan.parentElement;
        for (let i = 0; i < 4 && badge; i++) {
          const cs = getComputedStyle(badge);
          if (cs.display === "inline-flex" && cs.backgroundColor !== "rgba(0, 0, 0, 0)") break;
          badge = badge.parentElement;
        }
        if (badge) col.header.badge = pick(badge);
        // title typography
        const tcs = getComputedStyle(titleSpan);
        col.header.titleType = { font: tcs.fontFamily.slice(0, 80), size: tcs.fontSize, weight: tcs.fontWeight, lineHeight: tcs.lineHeight, color: tcs.color, letterSpacing: tcs.letterSpacing };
      }
    }
    // count: button next to title containing digits
    const countBtn = [...g.querySelectorAll("button")].find((b) => /^\d+$/.test((b.textContent || "").trim()));
    if (countBtn) col.header = { ...(col.header || {}), count: pick(countBtn), countText: txt(countBtn) };

    // cards
    const items = [...g.querySelectorAll(".notion-collection-item")];
    items.forEach((item) => {
      const a = item.querySelector("a[href^='/p/']");
      if (!a) return;
      const surface = a.parentElement;
      const titleEl = a.querySelector('[class*="content-editable-leaf"]');
      const card = {
        groupKey: title,
        surface: pick(surface),
        title: titleEl ? { ...pick(titleEl), text: txt(titleEl) } : null,
        href: a.getAttribute("href")
      };
      // title row + properties row (inline styled children of <a>)
      const kids = [...a.children];
      card.rows = kids.map((k) => ({
        style: k.getAttribute("style"),
        text: txt(k)
      }));
      // property badges: colored inline-flex elements
      const badges = [];
      a.querySelectorAll("span, div").forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === "inline-flex" && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && el.getBoundingClientRect().width > 10) {
          badges.push({
            text: txt(el),
            bg: cs.backgroundColor, color: cs.color,
            fontSize: cs.fontSize, lineHeight: cs.lineHeight,
            radius: cs.borderRadius, pad: cs.padding,
            rect: { w: +el.getBoundingClientRect().width.toFixed(1), h: +el.getBoundingClientRect().height.toFixed(1) }
          });
        }
      });
      card.badges = badges;
      col.cards.push(card);
      out.cards.push(card);
    });
    out.columns.push(col);
  });

  // card gaps: consecutive cards in same column
  out.cardGaps = [];
  groups.forEach((g) => {
    const items = [...g.querySelectorAll(".notion-collection-item")];
    for (let i = 1; i < items.length; i++) {
      const a = items[i - 1].getBoundingClientRect();
      const b = items[i].getBoundingClientRect();
      out.cardGaps.push(+(b.top - a.bottom).toFixed(2));
    }
  });

  return JSON.stringify(out, null, 2);
})()
