"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Item } from "./Item";
import { EmptyChildrenRow } from "./EmptyChildrenRow";
import { Star } from "lucide-react";
import { DatabaseIcon } from "./icons/DatabaseIcon";
import { PageIcon } from "./icons/PageIcon";
import { PlusIcon } from "./icons/PlusIcon";
import { toast } from "sonner";
import { getDocumentLabel } from "@/lib/utils";
import { useNewPage } from "@/hooks/useNewPage";
import { ActionTooltip } from "@/components/action-tooltip";

const compareDocuments = (a: Doc<"documents">, b: Doc<"documents">) => {
  if (a.order === undefined && b.order === undefined) {
    return b._creationTime - a._creationTime;
  }
  if (a.order === undefined) return -1;
  if (b.order === undefined) return 1;
  return a.order - b.order;
};

const FavoriteChildren = ({
  documents,
  parentId,
  level,
  navDrawer,
}: {
  documents: Doc<"documents">[];
  parentId: Id<"documents">;
  level: number;
  navDrawer?: boolean;
}) => {
  const params = useParams();
  const router = useRouter();
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const onToggleFavorite = (id: Id<"documents">) => {
    const promise = toggleFavorite({ id });
    toast.promise(promise, {
      loading: "Updating favorites...",
      success: "Favorites updated!",
      error: "Failed to update favorites.",
    });
  };

  const children = documents
    .filter((d) => d.parentDocument === parentId)
    .sort(compareDocuments);

  // Genişletilmiş ama çocuğu olmayan sayfa → Notion "No pages inside" satırı.
  if (children.length === 0) {
    return <EmptyChildrenRow level={level} />;
  }

  return (
    <div className="flex flex-col gap-[1px]">
      {children.map((document) => (
        <div key={document._id} className="flex flex-col gap-[1px]">
          <Item
            id={document._id}
            onClick={() => router.push(`/documents/${document._id}`)}
            label={getDocumentLabel(document.title, document.type)}
            icon={document.type === "database" ? DatabaseIcon : PageIcon}
            documentIcon={document.icon}
            active={params.documentId === document._id}
            level={level}
            expanded={expanded[document._id]}
            onExpand={() =>
              setExpanded((prev) => ({
                ...prev,
                [document._id]: !prev[document._id],
              }))
            }
            isFavorite={document.isFavorite}
            onFavorite={() => onToggleFavorite(document._id)}
            showDragHandle={false}
            navDrawer={navDrawer}
            hasChildren={true}
          />
          {expanded[document._id] && (
            <FavoriteChildren
              documents={documents}
              parentId={document._id}
              level={level + 1}
              navDrawer={navDrawer}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const FavoritesList = ({ navDrawer }: { navDrawer?: boolean }) => {
  const params = useParams();
  const router = useRouter();
  const documents = useQuery(api.documents.getFavorites);
  const allDocuments = useQuery(api.documents.getSearch);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const newPage = useNewPage();

  const onToggleFavorite = (id: Id<"documents">) => {
    const promise = toggleFavorite({ id });
    toast.promise(promise, {
      loading: "Updating favorites...",
      success: "Favorites updated!",
      error: "Failed to update favorites.",
    });
  };

  const onExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (documents === undefined) {
    return (
      <div className="mb-[12px] flex flex-col gap-[1px]">
        <Item.Skeleton level={0} />
        <Item.Skeleton level={0} />
      </div>
    );
  }

  if (documents.length === 0) return null;

  return (
    <div className="mb-[12px] flex w-full flex-col gap-[1px]">
      {/* Section header - spec: height 30, padding-inline 8, gap 4, radius 6, font 12/500/1 */}
      <div className="sidebar-section-header group/section flex h-[30px] items-center justify-between gap-[4px] rounded-[6px] px-[8px]">
        <p className="flex flex-1 items-center gap-[4px] truncate text-[12px] font-[500] leading-[1] text-[rgba(255,255,255,0.45)] whitespace-nowrap overflow-hidden text-ellipsis">
          <Star className="size-[12px] shrink-0 fill-yellow-400/80 text-yellow-400/80" />
          Favorites
        </p>
        <ActionTooltip label="Add a page">
          <button
            type="button"
            onClick={newPage.onOpen}
            aria-label="Add a page"
            className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-[rgba(255,255,255,0.35)] opacity-0 invisible transition-all duration-100 hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.7)] group-hover/section:visible group-hover/section:opacity-100"
          >
            <PlusIcon className="h-[16px] w-[16px]" />
          </button>
        </ActionTooltip>
      </div>
      <div className="flex flex-col gap-[1px]">
        {documents.map((document) => (
          <div key={document._id} className="flex flex-col gap-[1px]">
            <Item
              id={document._id}
              onClick={() => router.push(`/documents/${document._id}`)}
              label={getDocumentLabel(document.title, document.type)}
              icon={document.type === "database" ? DatabaseIcon : PageIcon}
              documentIcon={document.icon}
              active={params.documentId === document._id}
              level={0}
              expanded={expanded[document._id]}
              onExpand={() => onExpand(document._id)}
              isFavorite={document.isFavorite}
              onFavorite={() => onToggleFavorite(document._id)}
              showDragHandle={false}
              navDrawer={navDrawer}
              hasChildren={true}
            />
            {expanded[document._id] && allDocuments && (
              <FavoriteChildren
                documents={allDocuments}
                parentId={document._id}
                level={1}
                navDrawer={navDrawer}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
