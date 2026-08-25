"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { snackbar } from "@/lib/snackbar";
import { formatLastEdited } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Files,
  FolderInput,
  LucideIcon,
  MoreHorizontal,
  Pencil,
  Star,
} from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { usePeek } from "@/hooks/usePeek";
import { useOrigin } from "@/hooks/useOrigin";
import { useArchivingDoc } from "@/hooks/useArchivingDoc";
import { PagePicker } from "@/components/page-picker";
import { PageIcon } from "./icons/PageIcon";
import { ChevronIcon } from "./icons/ChevronIcon";
import { PlusIcon } from "./icons/PlusIcon";
import { LinkIcon } from "./icons/LinkIcon";
import { ArrowDiagonalUpRightIcon } from "./icons/ArrowDiagonalUpRightIcon";
import { SidebarRightIcon } from "./icons/SidebarRightIcon";
import { TrashIcon } from "./icons/TrashIcon";

/**
 * Notion'un "..." menüsündeki satır. Ölçüler paylaşılan DOM'dan:
 * 20px ikon, 14px metin, 14px yan boşluk, kısayol 12px ve soluk.
 */
const MenuAction = ({
  icon,
  label,
  shortcut,
  onClick,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onSelect?: () => void;
}) => (
  <DropdownMenuItem
    onClick={onClick}
    onSelect={onSelect}
    className="mx-[6px] gap-[10px] rounded-[6px] px-[8px] py-[6px] text-[14px] focus:bg-sidebar-hover focus:text-sidebar-text-active"
  >
    <span className="flex size-5 shrink-0 items-center justify-center">
      {icon}
    </span>
    <span className="flex-1 truncate">{label}</span>
    {shortcut && (
      <span className="ml-auto shrink-0 text-[12px] whitespace-nowrap text-sidebar-muted">
        {shortcut}
      </span>
    )}
  </DropdownMenuItem>
);

type SidebarIconType =
  | LucideIcon
  | React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface ItemProps {
  id?: Id<"documents">;
  documentIcon?: string;
  active?: boolean;
  expanded?: boolean;
  level?: number;
  onExpand?: () => void;
  label?: string;
  onClick?: (event: React.MouseEvent) => void;
  icon: SidebarIconType;
  isFavorite?: boolean;
  onFavorite?: () => void;
  shortcut?: string;
  showDragHandle?: boolean;
  navDrawer?: boolean;
  hasChildren?: boolean;
  applyIndent?: boolean;
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
  showDragHandle = false,
  navDrawer,
  hasChildren = false,
  applyIndent = true,
}: ItemProps) => {
  const router = useRouter();
  const params = useParams();
  const origin = useOrigin();

  const { data: session } = authClient.useSession();
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

  const onArchive = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    if (params.documentId === id) {
      markArchiving(id);
      router.push("/documents");
    }

    archive({ id })
      .then(() => {
        snackbar("Moved to Trash", {
          label: "Restore",
          onClick: () => restore({ id, keepPosition: true }),
        });
      })
      .catch(() => toast.error("Failed to archive note."));
  };

  const handleExpand = (
    event: React.MouseEvent<HTMLElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    onExpand?.();
  };

  const onCreate = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    const promise = create({ title: "", parentDocument: id }).then(
      (documentId) => {
        if (!expanded) {
          onExpand?.();
        }
        peek.onOpen(documentId, { pendingEmpty: true });
      },
    );

    promise.catch(() => toast.error("Failed to create note."));
  };

  const onDuplicate = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.stopPropagation();
    if (!id) return;

    const promise = duplicate({ id }).then((documentId) => {
      router.push(`/documents/${documentId}`);
    });

    promise.catch(() => toast.error("Failed to duplicate note."));
  };

  const onOpenChange = (open: boolean) => {
    if (!navDrawer) return;
    setInnerPopoverOpen(open);
  };

  // Spec: Level 0 → 8px, Level 1 → 16px, Level 2 → 24px, Level 3 → 32px (8px step)
  const indentPx = applyIndent ? 8 + level * 8 : 8;
  const isPageIcon = Icon === PageIcon;
  const isPlusIcon = Icon === PlusIcon;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        paddingLeft: `${indentPx}px`,
        paddingRight: "8px",
        paddingTop: "5px",
        paddingBottom: "5px",
      }}
      className={cn(
        // Final spec per user: 14px / 500, no tracking, no leading-none
        // 30px row, min 27px, 5px 8px padding, radius 6
        "group relative flex h-[30px] min-h-[27px] w-full items-center rounded-[6px] text-[14px] font-[500] select-none transition-colors duration-[20ms] ease-out",
        "whitespace-nowrap overflow-hidden text-ellipsis",
        "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active",
        active && "bg-sidebar-accent text-sidebar-text-active",
        navDrawer && !id && "rounded-full",
      )}
    >
      {/* Single 22px icon slot where page icon and chevron overlay - Notion DOM: width 22 height 18 margin-right 8 grid, good placement */}
      <div className="relative grid h-[18px] w-[22px] shrink-0 place-items-center mr-[8px]">
        {/* Page / database / generic icon - default visible, hidden on hover when hasChildren, no pointer events when hidden to avoid pır pır */}
        <div
          className={cn(
            "col-start-1 row-start-1 flex h-[18px] w-[22px] items-center justify-center transition-opacity duration-100",
            hasChildren && "group-hover:opacity-0 group-hover:pointer-events-none",
          )}
        >
          {documentIcon ? (
            <span className="text-[16px] leading-none grid place-items-center pointer-events-none">
              {documentIcon}
            </span>
          ) : (
            <Icon
              strokeWidth={1.8}
              className={cn(
                "shrink-0",
                isPageIcon
                  ? "h-[18px] w-[18px]"
                  : isPlusIcon
                    ? "h-[16px] w-[16px]"
                    : "h-[20px] w-[20px]",
                "text-sidebar-icon",
                active && "text-sidebar-text-active",
              )}
            />
          )}
        </div>

        {/* Chevron overlay - 20x20 hit area, 12x12 SVG, -90 closed 0 open, 200ms ease-out, filled style, pointer-events fix */}
        {hasChildren && (
          <div
            className={cn(
              "col-start-1 row-start-1 flex h-[18px] w-[22px] items-center justify-center opacity-0 pointer-events-none transition-opacity duration-100",
              "group-hover:opacity-100 group-hover:pointer-events-auto",
            )}
          >
            <button
              type="button"
              aria-label={expanded ? "Collapse" : "Expand"}
              aria-expanded={!!expanded}
              onClick={handleExpand}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] text-sidebar-chevron hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors duration-[20ms] focus:outline-none"
            >
              <ChevronIcon expanded={!!expanded} />
            </button>
          </div>
        )}
      </div>

      {/* Label - 14px/500, no tracking, no leading-none, nowrap ellipsis */}
      <div className="flex min-w-0 flex-1 items-center">
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
            className="w-full min-w-0 truncate bg-transparent text-[14px] font-[500] text-sidebar-text-active outline-none"
          />
        ) : (
          label && (
            <span
              className="truncate whitespace-nowrap text-[14px] font-[500]"
              title={label}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          )
        )}
      </div>

      {shortcut && (
        <kbd className="pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border border-sidebar-border bg-sidebar-hover px-1.5 font-mono text-[10px] font-medium text-sidebar-muted select-none md:inline-flex">
          {shortcut}
        </kbd>
      )}

      {!!id && (
        <div
          className={cn(
            "ml-auto flex shrink-0 items-center gap-[2px] overflow-hidden pl-[3px]",
            // Notion: aksiyon butonları rest'te yer kaplamaz (0 genişlik) — başlık
            // satırın tam genişliğine kadar uzanır ve en sağda ellipsis alır.
            // Hover'da butonlar görünür ve başlığı daraltır. visibility:hidden
            // yerine width:0 kullanıyoruz çünkü visibility layout'tan düşmez.
            "w-0 opacity-0 transition-[width,opacity] duration-100",
            "group-hover:w-auto group-hover:opacity-100 group-focus-within:w-auto group-focus-within:opacity-100",
          )}
        >
          <ActionTooltip label="Add sub-page">
            <button
              type="button"
              aria-label="Add sub-page"
              onClick={onCreate}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] text-sidebar-icon outline-none transition-colors hover:bg-sidebar-hover hover:text-sidebar-text-active focus-visible:opacity-100"
            >
              <PlusIcon className="h-[16px] w-[16px]" />
            </button>
          </ActionTooltip>
          <DropdownMenu onOpenChange={navDrawer ? onOpenChange : undefined}>
            <ActionTooltip label="More actions">
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                asChild
              >
                <div
                  role="button"
                  aria-label="More actions"
                  tabIndex={0}
                  className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] text-sidebar-icon outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-text-active focus-visible:opacity-100"
                >
                  <MoreHorizontal
                    className="h-[16px] w-[16px]"
                    strokeWidth={1.8}
                  />
                </div>
              </DropdownMenuTrigger>
            </ActionTooltip>
            <DropdownMenuContent
              // Notion ölçüleri (paylaşılan DOM): genişlik 265px, en fazla
              // 70vh, taşarsa kendi içinde kayar.
              className="max-h-[70vh] w-[265px] overflow-y-auto border-sidebar-border bg-popover p-0 py-[6px] text-popover-foreground"
              align="start"
              side="right"
              forceMount
            >
              {/* Notion menüsü doküman tipini üstte küçük ve soluk yazar. */}
              <DropdownMenuLabel className="px-[14px] pt-[6px] pb-[4px] text-[12px] font-normal text-sidebar-muted">
                {document?.type === "database" ? "Database" : "Page"}
              </DropdownMenuLabel>

              <MenuAction
                icon={
                  <Star
                    className={cn(
                      "size-5",
                      isFavorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-sidebar-icon",
                    )}
                  />
                }
                label={
                  isFavorite ? "Remove from Favorites" : "Add to Favorites"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite?.();
                }}
              />

              <DropdownMenuSeparator className="my-[6px] bg-sidebar-border" />

              <MenuAction
                icon={<LinkIcon className="size-auto h-5 w-auto text-sidebar-icon" />}
                label="Copy link"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyLink();
                }}
              />
              <MenuAction
                icon={<Files className="size-5 text-sidebar-icon" />}
                label="Duplicate"
                onClick={onDuplicate}
              />
              <MenuAction
                icon={<Pencil className="size-5 text-sidebar-icon" />}
                label="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename();
                }}
              />
              <MenuAction
                icon={<FolderInput className="size-5 text-sidebar-icon" />}
                label="Move to"
                onSelect={() => {
                  setTimeout(() => setIsMoveToOpen(true), 0);
                }}
              />
              <MenuAction
                icon={<TrashIcon className="size-5 text-sidebar-icon" />}
                label="Move to Trash"
                onClick={onArchive}
              />

              <DropdownMenuSeparator className="my-[6px] bg-sidebar-border" />

              <MenuAction
                icon={<ArrowDiagonalUpRightIcon className="size-auto h-5 w-auto text-sidebar-icon" />}
                label="Open in new tab"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInNewTab();
                }}
              />
              <MenuAction
                icon={<SidebarRightIcon className="size-5 text-sidebar-icon" />}
                label="Open in side peek"
                // Bu ipucu gerçek: Alt+Click sidebar'da side peek açıyor
                // (DocumentList.tsx). Notion'daki Ctrl+⇧+R / ⇧+P / ⇧+↵
                // kısayolları BİZDE YOK, o yüzden yazılmıyor.
                shortcut="Alt+Click"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInSidePeek();
                }}
              />

              <DropdownMenuSeparator className="my-[6px] bg-sidebar-border" />

              <div className="px-[14px] py-[6px] text-[12px] leading-[16px] text-sidebar-muted">
                <p>Last edited by {session?.user?.name ?? "you"}</p>
                <p>
                  {document
                    ? formatLastEdited(
                        document.updatedAt ?? document._creationTime,
                      )
                    : "…"}
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
      style={{ paddingLeft: `${8 + (level ?? 0) * 8}px` }}
      className="flex h-[30px] min-h-[27px] items-center px-[8px] py-[5px]"
    >
      <Skeleton className="mr-[8px] h-[18px] w-[22px] rounded-[4px] bg-sidebar-hover" />
      <Skeleton className="h-3 w-[50%] rounded-[3px] bg-sidebar-hover" />
    </div>
  );
};
