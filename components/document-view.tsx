"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { Cover } from "@/components/cover";
import { Toolbar, ToolbarHandle } from "@/components/toolbar";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { BlockNoteEditor } from "@blocknote/core";
import { TableOfContents } from "@/components/table-of-contents";
import { useEditorFont } from "@/hooks/useEditorFont";
import { getDocumentLabel } from "@/lib/utils";

// Modül kapsamında bir kez çağrılır — render içinde her seferinde yeni bir
// modül factory'si üretmez, bu yüzden grid Convex push'larında remount olmaz.
const DatabaseView = dynamic(
  () => import("@/components/database/database-view"),
  { ssr: false },
);

interface DocumentViewProps {
  documentId: Id<"documents">;
  /** Peek modalı içinde render edilirken sayfa başlığı/favicon'unu değiştirmez. */
  managesDocumentChrome?: boolean;
}

export const DocumentView = ({
  documentId,
  managesDocumentChrome = true,
}: DocumentViewProps) => {
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const isMarked = useRef(false);
  const toolbarRef = useRef<ToolbarHandle>(null);

  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    [],
  );

  const doc = useQuery(api.documents.getById, {
    documentId: documentId,
  });

  const { editorFont, isFontLoading } = useEditorFont({ enabled: true });

  const update = useMutation(api.documents.update);
  const markOpened = useMutation(api.documents.markOpened);

  useEffect(() => {
    if (!doc || isMarked.current) return;
    isMarked.current = true;
    markOpened({ id: documentId });
  }, [documentId, markOpened]);

  useEffect(() => {
    if (!managesDocumentChrome || !doc) return;

    const defaultFavicon =
      resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg";

    window.document.title = `${getDocumentLabel(doc.title, doc.type)} | Zotion`;

    const link = window.document.querySelector(
      "link[rel~='icon']",
    ) as HTMLLinkElement;
    if (link) {
      link.href = doc.icon
        ? `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-size='100'>${doc.icon}</text></svg>`
        : defaultFavicon;
    }

    return () => {
      window.document.title = "Zotion";
      if (link) link.href = defaultFavicon;
    };
  }, [managesDocumentChrome, doc?.title, doc?.icon, resolvedTheme, documentId]);

  useEffect(() => {
    if (!doc) return;
    if (doc.editorFont === editorFont) return;

    update({
      id: documentId,
      editorFont,
    });
  }, [doc, editorFont, documentId, update]);

  const activeFont = doc?.editorFont ?? editorFont;
  const isFullWidth = doc?.fullWidth ?? true;
  const isSmallText = doc?.smallText ?? false;
  const showToc = doc?.showToc ?? true;

  const onChange = (content: string) => {
    update({
      id: documentId,
      content,
    });
  };

  if (doc === undefined || isFontLoading) {
    return (
      <div>
        <Cover.Skeleton />
        <div className="mx-auto mt-10 md:max-w-3xl lg:max-w-4xl">
          <div className="space-y-4 pt-4 pl-8">
            <Skeleton className="h-14 w-1/2" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      </div>
    );
  }

  if (doc === null) {
    return <div>Not found</div>;
  }

  return (
    <div className="pb-35">
      <Cover
        documentId={documentId}
        url={doc.coverImage}
        positionY={doc.coverImageY}
        compact={!managesDocumentChrome}
      />
      <div
        className={`relative mx-auto md:w-[90%] ${
          !isFullWidth ? "max-w-200" : ""
        }`}
      >
        <Toolbar
          ref={toolbarRef}
          initialData={doc}
          editorFont={activeFont}
          flushLeft={doc.type === "database"}
          onFocusEditor={() => {
            if (!editor) return;
            editor.setTextCursorPosition(editor.document[0], "start");
            editor.focus();
          }}
        />
        {doc.type === "database" ? (
          <DatabaseView documentId={documentId} />
        ) : (
          <>
            <Editor
              onChange={onChange}
              initialContent={doc.content}
              smallText={isSmallText}
              onEditorReady={setEditor}
              editorFont={activeFont}
              onFocusTitle={() => toolbarRef.current?.focusEnd()}
            />
            {showToc && <TableOfContents editor={editor} />}
          </>
        )}
      </div>
    </div>
  );
};
