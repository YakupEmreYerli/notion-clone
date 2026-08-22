"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Files,
  FolderInput,
  GripVertical,
  LucideIcon,
  MoreHorizontal,
  PanelRight,
  Pencil,
  Plus,
  Settings,
  Star,
  Trash,
} from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { usePeek } from "@/hooks/usePeek";
import { useOrigin } from "@/hooks/useOrigin";
import { useArchivingDoc } from "@/hooks/useArchivingDoc";
import { PagePicker } from "@/components/page-picker";

interface ItemProps {
  id?: Id<"documents">;
  documentIcon?: string;
  active?: boolean;
  expanded?: boolean;
  level?: number;
  onExpand?: () => void;
  label?: string;
  onClick?: (event: React.MouseEvent) => void;
  icon: LucideIcon;
  isFavorite?: boolean;
  onFavorite?: () => void;
  shortcut?: string;
  showDragHandle?: boolean;
  navDrawer?: boolean;
}

export const Item = ({
  id,
  label,
  onClick,
  icon: Icon,
  active,
  documentIcon,
  level = 0,
  onExpand,
  expanded,
  isFavorite,
  onFavorite,
  shortcut,
  showDragHandle = true,
  navDrawer,
}: ItemProps) => {
  const router = useRouter();
  const params = useParams();
  const origin = useOrigin();

  const { setInnerPopoverOpen } = useNavDrawer();
  const markArchiving = useArchivingDoc((state) => state.markArchiving);
  const peek = usePeek();

  const create = useMutation(api.documents.create);
  const duplicate = useMutation(api.documents.duplicate);
  const archive = useMutation(api.documents.archive);
  const restore = useMutation(api.documents.restore);
  const update = useMutation(api.documents.update);

  const document = useQuery(
    api.documents.getById,
    id ? { documentId: id } : "skip",
  );

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(label ?? "");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [isMoveToOpen, setIsMoveToOpen] = useState(false);

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const onStartRename = () => {
    if (!id) return;
    setRenameValue(label ?? "");
    setIsRenaming(true);
  };

  const commitRename = () => {
    if (id && renameValue !== label) {
      update({ id, title: renameValue });
    }
    setIsRenaming(false);
  };

  const onCopyLink = () => {
    if (!id) return;
    navigator.clipboard.writeText(`${origin}/documents/${id}`);
    toast.success("Link copied");
  };

  const onOpenInNewTab = () => {
    if (!id) return;
    window.open(`/documents/${id}`, "_blank");
  };

  const onOpenInSidePeek = () => {
    if (!id) return;
    peek.onOpen(id, { mode: "side" });
  };

  const onMove = (parentDocument: Id<"documents"> | undefined) => {
    if (!id) return;
    if (parentDocument) {
      update({ id, parentDocument });
    } else {
      update({ id, unparent: true });
    }
  };

  const onArchive = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    if (params.documentId === id) {
      markArchiving(id);
      router.push("/documents");
    }

    const promise = archive({ id });

    toast.promise(promise, {
      loading: "Moving to trash...",
      error: "Failed to archive note.",
    });

    promise.then(() => {
      toast("Note moved to trash", {
        action: {
          label: "Undo",
          onClick: () => restore({ id }),
        },
      });
    });
  };

  const handleExpand = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    onExpand?.();
  };

  const onCreate = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    const promise = create({ title: "", parentDocument: id }).then(
      (documentId) => {
        if (!expanded) {
          onExpand?.();
        }

        // "Full page"/"New tab" tek seferlik bir aksiyondur, kalıcı tercih
        // değildir — yeni alt sayfa her zaman peek (center/side) ile açılır.
        // pendingEmpty: PeekModal bu belgeyi başlıksız+içeriksiz kapatılırsa
        // sessizce siler (Notion'da doğrulanan davranış).
        peek.onOpen(documentId, { pendingEmpty: true });
      },
    );

    toast.promise(promise, {
      loading: "Creating new note",
      success: "New note created.",
      error: "Failed to create note.",
    });
  };

  const onDuplicate = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    const promise = duplicate({ id }).then((documentId) => {
      router.push(`/documents/${documentId}`);
    });

    toast.promise(promise, {
      loading: "Duplicating note...",
      success: "Note duplicated.",
      error: "Failed to duplicate note.",
    });
  };

  const onOpenChange = (open: boolean) => {
    if (!navDrawer) return;
    setInnerPopoverOpen(open);
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      onClick={onClick}
      role="button"
      style={{ paddingLeft: level ? `${level * 12 + 12}px` : "12px" }}
      className={cn(
        "group text-foreground/80 relative mx-2 flex min-h-8 w-[calc(100%-1rem)] items-center rounded-md py-1.5 pr-3 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700/60",
        active &&
          "text-foreground bg-neutral-200 font-semibold dark:bg-neutral-700/60",
        navDrawer && !id && "rounded-full",
      )}
    >
      <div className="group flex items-center justify-center truncate">
        {!!id && showDragHandle && (
          <GripVertical className="text-muted-foreground/50 absolute left-0.5 size-3 opacity-0 group-hover:opacity-100" />
        )}
        {!!id && (
          <div
            role="button"
            aria-label={expanded ? "Collapse page" : "Expand page"}
            aria-expanded={!!expanded}
            className="mr-1 h-full rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600"
            onClick={handleExpand}
          >
            <ChevronIcon className="text-muted-foreground/50 h-4 w-4 shrink-0" />
          </div>
        )}
        {documentIcon ? (
          <div className="mr-1 shrink-0 text-[1.125rem] leading-none">
            {documentIcon}
          </div>
        ) : (
          <Icon
            className={`text-foreground/70 h-4.5 w-4.5 shrink-0 ${navDrawer && Icon === Settings ? "mr-0" : "mr-2"}`}
          />
        )}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setIsRenaming(false);
              }
            }}
            className="w-full min-w-0 truncate bg-transparent outline-none"
          />
        ) : (
          label && (
            <span className="truncate" title={label}>
              {label}
            </span>
          )
        )}
      </div>
      {shortcut && (
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[.625rem] font-medium opacity-100 select-none md:inline-flex dark:bg-neutral-700">
          {shortcut}
        </kbd>
      )}
      {!!id && (
        <div className="ml-auto flex items-center gap-x-2">
          <ActionTooltip label="Add sub-page">
            <div
              role="button"
              aria-label="Add sub-page"
              onClick={onCreate}
              className="ml-auto h-full rounded-sm opacity-100 transition hover:bg-neutral-300 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-neutral-600"
            >
              <Plus className="text-muted-foreground h-4 w-4" />
            </div>
          </ActionTooltip>
          <DropdownMenu onOpenChange={navDrawer ? onOpenChange : undefined}>
            <ActionTooltip label="More actions">
              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                <div
                  role="button"
                  aria-label="More actions"
                  className="ml-auto h-full rounded-sm opacity-100 transition hover:bg-neutral-300 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-neutral-600"
                >
                  <MoreHorizontal className="text-muted-foreground h-4 w-4" />
                </div>
              </DropdownMenuTrigger>
            </ActionTooltip>
            <DropdownMenuContent
              className="w-65"
              align="start"
              side="right"
              forceMount
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.();
                }}
              >
                <Star
                  className={cn(
                    "mr-2 h-4 w-4",
                    isFavorite && "fill-yellow-400 text-yellow-400",
                  )}
                />
                {isFavorite ? "Remove from favorites" : "Add to favorites"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyLink();
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Files className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename();
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  // Menü önce kapanır; ikinci Radix katmanı bir sonraki tick'te
                  // açılarak iki DismissableLayer'ın aynı pointer olayını
                  // paylaşması engellenir.
                  setTimeout(() => setIsMoveToOpen(true), 0);
                }}
              >
                <FolderInput className="mr-2 h-4 w-4" />
                Move to
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInNewTab();
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInSidePeek();
                }}
              >
                <PanelRight className="mr-2 h-4 w-4" />
                Open in side peek
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="space-y-0.5 p-2 text-[.6875rem]">
                <p className="text-muted-foreground/70">
                  Last edited on{" "}
                  {document
                    ? new Date(
                        document.updatedAt ?? document._creationTime,
                      ).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "..."}
                </p>
                <p className="text-muted-foreground/70">
                  Created on{" "}
                  {document
                    ? new Date(document._creationTime).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "..."}
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {id && (
            <PagePicker
              excludeId={id}
              includeRoot
              dialog
              open={isMoveToOpen}
              onOpenChange={setIsMoveToOpen}
              onSelect={(parentDocument) => onMove(parentDocument)}
            />
          )}
        </div>
      )}
    </div>
  );
};

Item.Skeleton = function ItemSkeleton({ level }: { level?: number }) {
  return (
    <div
      style={{ paddingLeft: level ? `${level * 12 + 25}px` : "12px" }}
      className="flex gap-x-2 py-0.75"
    >
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-[30%]" />
    </div>
  );
};
