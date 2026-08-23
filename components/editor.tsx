"use client";

import { useEffect, useRef, useState } from "react";
import { EditorFont } from "@/hooks/useEditorFont";
import { useCoverImage } from "@/hooks/useCoverImage";
import { useWordCount } from "@/hooks/useWordCount";
import { fontFamilies } from "@/lib/editorFont";
import {
  BlockNoteEditor,
  PartialBlock,
  createCodeBlockSpec,
  BlockNoteSchema,
} from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { TextSelectionMenuController } from "@/components/editor/TextSelectionMenuController";
import { useTheme } from "next-themes";
import { deleteFile, uploadFile } from "@/lib/storage";
import { codeBlockOptions } from "@blocknote/code-block";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";
import { Doc } from "@/convex/_generated/dataModel";
import { ImageContextMenu } from "@/components/image-context-menu";

interface EditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  editable?: boolean;
  editorFont?: string;
  smallText?: boolean;
  onEditorReady?: (editor: BlockNoteEditor) => void;
  onFocusTitle?: () => void;
}

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec({
      ...codeBlockOptions,
      defaultLanguage: "typescript",
      supportedLanguages: {
        typescript: { name: "TypeScript", aliases: ["ts"] },
        javascript: { name: "JavaScript", aliases: ["js"] },
        python: { name: "Python", aliases: ["py"] },
        cpp: { name: "C++", aliases: ["cpp", "c++"] },
        java: { name: "Java" },
        rust: { name: "Rust", aliases: ["rs"] },
        go: { name: "Go" },
        sql: { name: "SQL" },
        html: { name: "HTML" },
        css: { name: "CSS" },
      },
    }),
  },
});

const MEDIA_BLOCK_TYPES = new Set(["image", "video", "audio", "file"]);

const getMediaUrls = (editor: BlockNoteEditor): Set<string> => {
  const urls = new Set<string>();

  editor.forEachBlock((block) => {
    if (MEDIA_BLOCK_TYPES.has(block.type)) {
      const url = (block.props as any)?.url;
      if (url && typeof url === "string" && url.trim() !== "") {
        urls.add(url);
      }
    }
    return true;
  });

  return urls;
};

const Editor = ({
  onChange,
  initialContent,
  editable = true,
  editorFont,
  smallText = false,
  onEditorReady,
  onFocusTitle,
}: EditorProps) => {
  const { resolvedTheme } = useTheme();

  const coverImage = useCoverImage();
  const wordCount = useWordCount();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackedUrlsRef = useRef<Set<string>>(new Set());

  // Image sağ tık context menu — açıkken imleç konumu + hedef block id.
  const [imageMenu, setImageMenu] = useState<{
    x: number;
    y: number;
    blockId: string;
  } | null>(null);

  const handleUpload = async (file: File) => uploadFile(file);

  const getWords = () => {
    let count: number = 0;
    editor.forEachBlock((block) => {
      if (
        block.type === "paragraph" ||
        block.type === "heading" ||
        block.type === "quote" ||
        block.type === "bulletListItem" ||
        block.type === "checkListItem" ||
        block.type === "numberedListItem" ||
        block.type === "toggleListItem"
      ) {
        const words = block.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join(" ")
          .trim()
          .split(/\s+/)
          .filter((word) => /[a-zA-Z0-9]/.test(word));

        count += words.length;
      }

      if (block.type === "table") {
        block.content.rows.forEach((row) => {
          row.cells.forEach((cell: any) => {
            const words = cell.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join(" ")
              .trim()
              .split(/\s+/)
              .filter((word: string) => /[a-zA-Z0-9]/.test(word));

            count += words.length;
          });
        });
      }

      return true;
    });
    wordCount.setWordCount(count);
  };

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    uploadFile: handleUpload,
    schema,
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
  });

  useEffect(() => {
    if (editor) {
      trackedUrlsRef.current = getMediaUrls(editor);
      getWords();
    }
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor]);

  const handleEditorChange = () => {
    const currentUrls = getMediaUrls(editor);
    const previousUrls = trackedUrlsRef.current;

    const removedUrls = [...previousUrls].filter(
      (url) => !currentUrls.has(url),
    );

    removedUrls.forEach((url) => {
      deleteFile(url).catch((err) => {
        console.warn("Failed to delete file from storage:", url, err);
      });
    });
    trackedUrlsRef.current = currentUrls;

    getWords();

    onChange(JSON.stringify(editor.document, null, 2));
  };

  // İçeriğin en başındayken (ilk blok, imleç offset 0) ArrowUp basılınca
  // başlığa geçilir — Notion'daki "yukarı bas bas çık" davranışı.
  // Bubble fazında çalışır: BlockNote önce kendi imleç hareketini
  // dener; hâlâ ilk bloktaysak gidecek yer kalmamış demektir.
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" || !onFocusTitle) return;

    const pos = editor.getTextCursorPosition();
    if (pos.prevBlock) return;

    const selection = (editor as any)._tiptapEditor?.state?.selection;
    if (!selection?.empty || selection.$from.parentOffset !== 0) return;

    e.preventDefault();
    onFocusTitle();
  };

  const handleCapture = (e: React.DragEvent) => {
    if (coverImage.isOpen) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable || coverImage.isOpen) return;

    const blockEl = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-node-type='blockContainer']",
    );
    if (!blockEl) return;

    const blockId = blockEl.getAttribute("data-id");
    if (!blockId) return;

    const currentBlock = editor.getBlock(blockId);
    if (!currentBlock) return;
    const prevBlock = editor.getPrevBlock(blockId);
    if (!prevBlock) return;

    if (!MEDIA_BLOCK_TYPES.has(prevBlock?.type as string)) return;

    e.stopPropagation();

    const view = (editor as any)._tiptapEditor.view;
    const pos = view.posAtCoords({ left: e.clientX, top: e.clientY });

    if (pos) {
      view.dispatch(
        view.state.tr.setSelection(
          view.state.selection.constructor.near(
            view.state.doc.resolve(pos.pos),
          ),
        ),
      );
    }
    editor.focus();
  };

  // Image block üzerinde sağ tık → browser default menu'yü kapat, imlecin
  // yanında Notion tarzı context menu aç. Sadece image'lar; diğer bloklarda
  // default davranış korunur.
  const handleContextMenu = (e: React.MouseEvent) => {
    const imgEl = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-content-type='image']",
    );
    if (!imgEl) return;

    const blockEl = imgEl.closest<HTMLElement>(
      "[data-node-type='blockContainer']",
    );
    const blockId = blockEl?.getAttribute("data-id");
    if (!blockId) return;

    e.preventDefault();
    e.stopPropagation();
    setImageMenu({ x: e.clientX, y: e.clientY, blockId });
  };

  const getImageUrl = (blockId: string): string | undefined => {
    const block = editor.getBlock(blockId);
    return (block?.props as { url?: string } | undefined)?.url;
  };

  // En iyi çaba implementasyonlar; başarısızlıkta sessizce geç (sahte toast
  // göstermeyiz).
  const handleCopyImage = async (blockId: string) => {
    const url = getImageUrl(blockId);
    if (!url || typeof ClipboardItem === "undefined") return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || "image/png"]: blob }),
      ]);
    } catch {
      // sessiz
    }
  };

  const handleDownload = async (blockId: string) => {
    const url = getImageUrl(blockId);
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = url.split("/").pop()?.split("?")[0] || "image";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // sessiz
    }
  };

  const handleCopyBlockLink = async (blockId: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}#${blockId}`,
      );
    } catch {
      // sessiz
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    editor.removeBlocks([blockId]);
  };

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1 shrink-0 px-0 pb-10"
      style={
        {
          "--editor-font": fontFamilies[editorFont as EditorFont],
          "--editor-font-size": smallText ? "15px" : "16px",
        } as React.CSSProperties
      }
      onDropCapture={handleCapture}
      onDragOverCapture={handleCapture}
      onMouseDown={handleMouseDown}
      onKeyDown={handleEditorKeyDown}
      onContextMenu={handleContextMenu}
    >
      <BlockNoteView
        editable={editable && !coverImage.isOpen}
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={handleEditorChange}
        className="wrap-break-word"
        formattingToolbar={false}
      >
        <TextSelectionMenuController />
      </BlockNoteView>
      <ImageContextMenu
        open={!!imageMenu}
        x={imageMenu?.x ?? 0}
        y={imageMenu?.y ?? 0}
        onClose={() => setImageMenu(null)}
        onCopyImage={
          imageMenu ? () => handleCopyImage(imageMenu.blockId) : undefined
        }
        onDownload={
          imageMenu ? () => handleDownload(imageMenu.blockId) : undefined
        }
        onCopyLink={
          imageMenu ? () => handleCopyBlockLink(imageMenu.blockId) : undefined
        }
        onDelete={
          imageMenu ? () => handleDeleteBlock(imageMenu.blockId) : undefined
        }
      />
    </div>
  );
};

export default Editor;
