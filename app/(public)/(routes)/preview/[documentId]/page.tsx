"use client";

import dynamic from "next/dynamic";
import { use } from "react";

import { Cover } from "@/components/cover";
import { Toolbar } from "@/components/toolbar";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

// İkisi de modül kapsamında — render içinde dynamic() import'u React-compiler
// lint kuralına takılır (bkz. frontend.md).
const DatabaseView = dynamic(
  () => import("@/components/database/database-view"),
  { ssr: false },
);
const Editor = dynamic(() => import("@/components/editor"), { ssr: false });

interface DocumentIdPageProps {
  params: Promise<{
    documentId: Id<"documents">;
  }>;
}

const DocumentIdPage = ({ params }: DocumentIdPageProps) => {
  const { documentId } = use(params);

  const document = useQuery(api.documents.getById, {
    documentId: documentId,
  });

  const update = useMutation(api.documents.update);

  const onChange = (content: string) => {
    update({
      id: documentId,
      content,
    });
  };

  if (document === undefined) {
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

  if (document === null) {
    return <div>Not found</div>;
  }

  return (
    <div className="pb-40">
      <Cover
        documentId={documentId}
        preview
        url={document.coverImage}
        positionY={document.coverImageY}
        database={document.type === "database"}
      />
      <div
        className={`mx-auto md:w-full ${
          document.type === "database" && document.fullWidth
            ? "max-w-[calc(100%-192px)]"
            : "md:max-w-3xl lg:max-w-4xl"
        }`}
      >
        <Toolbar
          preview
          initialData={document}
          editorFont={document.editorFont ?? "default"}
        />
        {document.type === "database" ? (
          <DatabaseView documentId={documentId} editable={false} />
        ) : (
          <Editor
            editable={false}
            onChange={onChange}
            initialContent={document.content}
            editorFont={document.editorFont ?? "default"}
          />
        )}
      </div>
    </div>
  );
};
export default DocumentIdPage;
