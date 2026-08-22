"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { getDocumentLabel } from "@/lib/utils";
import { usePeek } from "@/hooks/usePeek";
import { useLiveTitleDrafts } from "@/hooks/useLiveTitleDrafts";
import { Item } from "./Item";
import { FileIcon, Table2 } from "lucide-react";
import { toast } from "sonner";

interface VisibleDocument {
  document: Doc<"documents">;
  level: number;
  siblingIndex: number;
}

interface SortableItemProps extends VisibleDocument {
  sortableDisabled?: boolean;
  onExpand: (id: string) => void;
  expanded: boolean;
  onRedirect: (id: string, event: React.MouseEvent) => void;
  activeId?: string | string[];
  onFavorite?: (id: Id<"documents">) => void;
  navDrawer?: boolean;
}

const SortableItem = ({
  document,
  sortableDisabled,
  level,
  siblingIndex,
  onExpand,
  expanded,
  onRedirect,
  activeId,
  onFavorite,
  navDrawer,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: document._id,
    disabled: sortableDisabled,
    data: {
      parentDocument: document.parentDocument,
      order: document.order,
      siblingIndex,
    },
  });
  const draftTitle = useLiveTitleDrafts((state) => state.drafts[document._id]);
  const label = getDocumentLabel(draftTitle ?? document.title, document.type);
  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, scaleY: 1, scaleX: 1 } : null),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Item
        id={document._id}
        onClick={(event) => onRedirect(document._id, event)}
        label={label}
        icon={document.type === "database" ? Table2 : FileIcon}
        documentIcon={document.icon}
        active={activeId === document._id}
        level={level}
        onExpand={() => onExpand(document._id)}
        expanded={expanded}
        isFavorite={document.isFavorite}
        onFavorite={() => onFavorite?.(document._id)}
        navDrawer={navDrawer}
      />
    </div>
  );
};

export const DocumentList = ({
  navDrawer,
  parentDocumentId,
  level = 0,
}: {
  navDrawer?: boolean;
  parentDocumentId?: Id<"documents">;
  level?: number;
}) => {
  const params = useParams();
  const router = useRouter();
  const peek = usePeek();
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const documents = useQuery(api.documents.getSearch);

  const onExpand = (documentId: string) => {
    setExpanded((previous) => ({ ...previous, [documentId]: !previous[documentId] }));
  };
  const onToggleFavorite = (id: Id<"documents">) => {
    const promise = toggleFavorite({ id });
    toast.promise(promise, {
      loading: "Updating favorites...",
      success: "Favorites updated!",
      error: "Failed to update favorites.",
    });
  };

  const visibleDocuments = useMemo<VisibleDocument[] | undefined>(() => {
    if (!documents) return undefined;
    const compareDocuments = (a: Doc<"documents">, b: Doc<"documents">) => {
      if (a.order === undefined && b.order === undefined) return b._creationTime - a._creationTime;
      if (a.order === undefined) return -1;
      if (b.order === undefined) return 1;
      return a.order - b.order;
    };
    const byParent = new Map<string, Doc<"documents">[]>();
    const byId = new Map(documents.map((document) => [document._id, document]));
    for (const document of documents) {
      const key = document.parentDocument ?? "root";
      byParent.set(key, [...(byParent.get(key) ?? []), document]);
    }
    for (const siblings of byParent.values()) siblings.sort(compareDocuments);

    const result: VisibleDocument[] = [];
    const visited = new Set<Id<"documents">>();
    const append = (parentDocument: Id<"documents"> | undefined, level: number) => {
      const siblings = byParent.get(parentDocument ?? "root") ?? [];
      siblings.forEach((document, siblingIndex) => {
        if (visited.has(document._id)) return;
        visited.add(document._id);
        result.push({ document, level, siblingIndex });
        if (expanded[document._id]) append(document._id, level + 1);
      });
    };
    append(parentDocumentId, level);

    // Çökmüş dalların çocukları da visited'a girmez; onları yetim sanıp köke
    // taşımamak için parent zincirini köke kadar doğrula.
    if (!parentDocumentId) {
      for (const document of documents) {
        let current = document;
        const ancestors = new Set<Id<"documents">>();
        let reachesRoot = true;

        while (current.parentDocument) {
          if (ancestors.has(current._id)) {
            reachesRoot = false;
            break;
          }
          ancestors.add(current._id);
          const parent = byId.get(current.parentDocument);
          if (!parent) {
            reachesRoot = false;
            break;
          }
          current = parent;
        }

        if (!visited.has(document._id) && !reachesRoot) {
          visited.add(document._id);
          result.push({ document, level: 0, siblingIndex: 0 });
        }
      }
    }
    return result;
  }, [documents, expanded, level, parentDocumentId]);

  const onRedirect = (documentId: string, event: React.MouseEvent) => {
    if (event.altKey) {
      peek.onOpen(documentId as Id<"documents">, { mode: "side" });
      return;
    }
    router.push(`/documents/${documentId}`);
  };

  if (visibleDocuments === undefined) {
    return <><Item.Skeleton /><Item.Skeleton /><Item.Skeleton /></>;
  }

  return (
    <div className="w-full">
      <SortableContext id="sidebar" items={visibleDocuments.map(({ document }) => document._id)} strategy={verticalListSortingStrategy}>
        {visibleDocuments.map((item) => (
          <SortableItem
            key={item.document._id}
            {...item}
            sortableDisabled={!!parentDocumentId}
            onExpand={onExpand}
            expanded={!!expanded[item.document._id]}
            onRedirect={onRedirect}
            activeId={params.documentId}
            onFavorite={onToggleFavorite}
            navDrawer={navDrawer}
          />
        ))}
      </SortableContext>
    </div>
  );
};
