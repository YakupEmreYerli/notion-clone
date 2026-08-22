// BlockNote'un JSON.stringify edilmiş `editor.document`'inden arama için
// düz metin çıkarır. DOM'a ihtiyaç duymaz, saf JSON gezme — Convex
// fonksiyonları içinde (server tarafında) çalışabilir.

type InlineContent = {
  type?: string;
  text?: string;
  content?: InlineContent[];
};

type Block = {
  type?: string;
  content?: InlineContent[];
  children?: Block[];
};

const collectInlineText = (items: InlineContent[] | undefined, out: string[]) => {
  if (!items) return;
  for (const item of items) {
    if (typeof item.text === "string" && item.text.length > 0) {
      out.push(item.text);
    }
    if (item.content) {
      collectInlineText(item.content, out);
    }
  }
};

const collectBlockText = (blocks: Block[] | undefined, out: string[]) => {
  if (!blocks) return;
  for (const block of blocks) {
    collectInlineText(block.content, out);
    if (block.children) {
      collectBlockText(block.children, out);
    }
  }
};

export const extractPlainText = (contentJson: string | undefined): string => {
  if (!contentJson) return "";

  let blocks: Block[];
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
