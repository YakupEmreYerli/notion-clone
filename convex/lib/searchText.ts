// BlockNote'un JSON.stringify edilmiş `editor.document`'inden arama için
// düz metin çıkarır. DOM'a ihtiyaç duymaz, saf JSON gezme — Convex
// fonksiyonları içinde (server tarafında) çalışabilir.

type InlineContent = {
  type?: string;
  text?: string;
  content?: InlineContent[];
};

// `table` bloğunun `content`'i normal bloklardan farklı bir şekle sahiptir:
// bir dizi değil, `{ rows: [{ cells: [...] }] }` şeklinde bir nesnedir.
// `cells` de BlockNote sürümüne göre iki farklı şekilde olabilir:
//  - InlineContent[][]  (her hücre doğrudan bir inline-content dizisi)
//  - { type: "tableCell", content: InlineContent[] }[]  (her hücre bir nesne)
type TableCell = InlineContent[] | { content?: InlineContent[] };

type TableContent = {
  type?: string;
  rows?: { cells?: TableCell[] }[];
};

type Block = {
  type?: string;
  content?: InlineContent[] | TableContent;
  children?: Block[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const collectInlineText = (items: unknown, out: string[]) => {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (!isObject(item)) continue;
    if (typeof item.text === "string" && item.text.length > 0) {
      out.push(item.text);
    }
    if (item.content !== undefined) {
      collectInlineText(item.content, out);
    }
  }
};

const collectTableCellText = (cell: unknown, out: string[]) => {
  if (Array.isArray(cell)) {
    // Şekil 1: hücre doğrudan bir InlineContent[]
    collectInlineText(cell, out);
    return;
  }
  if (isObject(cell) && cell.content !== undefined) {
    // Şekil 2: hücre { type: "tableCell", content: InlineContent[] }
    collectInlineText(cell.content, out);
  }
};

const collectTableText = (tableContent: unknown, out: string[]) => {
  if (!isObject(tableContent)) return;
  const rows = tableContent.rows;
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (!isObject(row)) continue;
    const cells = row.cells;
    if (!Array.isArray(cells)) continue;
    for (const cell of cells) {
      collectTableCellText(cell, out);
    }
  }
};

const collectBlockText = (blocks: unknown, out: string[]) => {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (!isObject(block)) continue;

    if (block.type === "table") {
      collectTableText(block.content, out);
    } else {
      collectInlineText(block.content, out);
    }

    if (block.children !== undefined) {
      collectBlockText(block.children, out);
    }
  }
};

export const extractPlainText = (contentJson: string | undefined): string => {
  if (!contentJson) return "";

  let blocks: unknown;
  try {
    blocks = JSON.parse(contentJson);
  } catch {
    return "";
  }

  if (!Array.isArray(blocks)) return "";

  const out: string[] = [];
  collectBlockText(blocks, out);
  return out.join(" ");
};

// `title` + içerikten çıkarılan düz metni tek bir arama alanına birleştirir.
// `documents.ts`'teki create/update/duplicate/backfill çağrı yerlerinin
// hepsi bu formatı kullanır, böylece format tek bir yerde kalır.
export const buildSearchText = (
  title: string,
  content: string | undefined,
): string => {
  return `${title}\n${extractPlainText(content)}`;
};
