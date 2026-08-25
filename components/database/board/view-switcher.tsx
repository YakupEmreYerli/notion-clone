"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Check, LayoutPanelLeft, Plus, Rows3 } from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DatabaseView } from "@/components/database/types";
import { cn } from "@/lib/utils";
// Menü ikonları Notion'un kendi çizimleri (viewBox'lar DOM'dan birebir).
// Çöp ikonu HER YERDE bu — lucide'ın kırmızı/başka çizimi kullanılmaz.
import { CheckmarkSmallIcon } from "@/app/(main)/_components/icons/CheckmarkSmallIcon";
import { ChevronRightSmallIcon } from "@/app/(main)/_components/icons/ChevronRightSmallIcon";
import { DuplicateIcon } from "@/app/(main)/_components/icons/DuplicateIcon";
import { LinkIcon as NotionLinkIcon } from "@/app/(main)/_components/icons/LinkIcon";
import { PaintBrushIcon } from "@/app/(main)/_components/icons/PaintBrushIcon";
import { PathRoundEndsIcon } from "@/app/(main)/_components/icons/PathRoundEndsIcon";
import { PencilLineIcon } from "@/app/(main)/_components/icons/PencilLineIcon";
import { SlidersLargeIcon } from "@/app/(main)/_components/icons/SlidersLargeIcon";
import { TrashIcon } from "@/app/(main)/_components/icons/TrashIcon";

// View switcher sekmeleri. Aktif view ?v=<id> ile adreslenir; tıklama
// history.replaceState ile URL'i günceller (reload'da view korunur).
// Sağ tıklama menüsü (Notion'dan ölçülen): Rename / Duplicate / Delete /
// Copy link to view — son view silinemez, silme hatası toast ile döner.
interface ViewSwitcherProps {
  views: DatabaseView[];
  activeViewId?: string;
  onSelect: (viewId: string) => void;
  onCreate: (type: "table" | "board") => void;
  /** Notion menüsündeki "Source" satırı için — kaynak database'in adı. */
  databaseTitle?: string;
  /** "Edit view": toolbar'daki ayar panelini açar. */
  onEditView?: () => void;
  editable?: boolean;
}

/** Notion "Display as" seçenekleri (DOM'dan birebir sıralama ve metin). */
const TAB_DISPLAY_OPTIONS = [
  { value: "textAndIcon", label: "Text and icon" },
  { value: "textOnly", label: "Text only" },
  { value: "iconOnly", label: "Icon only" },
] as const;

const VIEW_ICON = {
  table: Rows3,
  board: LayoutPanelLeft,
} as const;

export const ViewSwitcher = ({
  views,
  activeViewId,
  onSelect,
  onCreate,
  databaseTitle,
  onEditView,
  editable = true,
}: ViewSwitcherProps) => {
  const renameView = useMutation(api.databaseViews.renameView);
  const updateViewSettings = useMutation(
    api.databaseViews.updateViewSettings,
  );
  const duplicateView = useMutation(api.databaseViews.duplicateView);
  const deleteView = useMutation(api.databaseViews.deleteView);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ viewId: Id<"databaseViews">; x: number; y: number } | null>(null);
  // "Display as" alt menüsü. ContextMenu primitive'i iç içe menü
  // desteklemiyor, bu yüzden ikinci bir menü ana menünün sağına açılıyor.
  const [displayAs, setDisplayAs] = useState<{ x: number; y: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  // Alt menunun kok elemani. Ana menu bunu "iceri" saysin diye: alt menu
  // ayri bir portal'da ciziliyor, aksi halde alt menuye basildigi anda ana
  // menu kapanir ve tiklama hic ulasmaz.
  const submenuRef = useRef<HTMLDivElement | null>(null);

  // Notion: alt menu HOVER ile aciliyor, tiklama sart degil; komsu satira
  // gecilince kapaniyor. Gecikme yok.
  const openDisplayAs = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDisplayAs({ x: rect.right + 4, y: rect.top });
  };

  const commitRename = (view: DatabaseView) => {
    const name = inputRef.current?.value.trim();
    setRenamingId(null);
    if (name && name !== view.name) {
      renameView({ viewId: view._id, name });
    }
  };

  const onDuplicate = async (viewId: Id<"databaseViews">) => {
    const copyId = await duplicateView({ viewId });
    onSelect(copyId);
  };

  const onDelete = async (viewId: Id<"databaseViews">) => {
    try {
      await deleteView({ viewId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "View could not be deleted");
    }
  };

  const onCopyLink = async (viewId: Id<"databaseViews">) => {
    const url = new URL(window.location.href);
    url.searchParams.set("v", viewId);
    await navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="flex items-center gap-0.5">
      {views.map((view) => {
        const Icon = VIEW_ICON[view.type] ?? Rows3;
        const active = view._id === activeViewId;
        const renaming = renamingId === view._id;
        // "Display as" ayarı; undefined = Notion varsayılanı.
        const display = view.tabDisplay ?? "textAndIcon";

        if (renaming) {
          return (
            <input
              key={view._id}
              ref={inputRef}
              defaultValue={view.name}
              autoFocus
              onBlur={() => commitRename(view)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitRename(view);
                if (e.key === "Escape") setRenamingId(null);
              }}
              className="bg-secondary text-foreground h-8 w-32 rounded-md px-2 text-sm outline-none"
            />
          );
        }

        return (
          <button
            key={view._id}
            type="button"
            onClick={() => onSelect(view._id)}
            onDoubleClick={() => editable && setRenamingId(view._id)}
            onContextMenu={(e) => {
              if (!editable) return;
              e.preventDefault();
              // Notion: menü sekmenin SOL-ALT köşesine sabit
              // (`--x-insetInlineStart: 0`, sarmalayıcı `top: 100%`).
              // Fare konumu kullanılmaz — menü her seferinde aynı yerde açılır.
              const rect = e.currentTarget.getBoundingClientRect();
              setMenu({ viewId: view._id, x: rect.left, y: rect.bottom });
            }}
            className={cn(
              "text-foreground/80 hover:bg-secondary flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
              active && "bg-secondary text-foreground",
            )}
          >
            {display !== "textOnly" && <Icon className="size-3.5" />}
            {display !== "iconOnly" && (
              <span className="truncate">{view.name}</span>
            )}
          </button>
        );
      })}

      <ContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        // Notion ölçüsü (paylaşılan DOM): 220px.
        className="w-[220px]"
        ignoreRef={submenuRef}
        onClose={() => {
          setMenu(null);
          setDisplayAs(null);
        }}
      >
        {menu && (
          <>
            <ContextMenuItem
              icon={<PencilLineIcon />}
              label="Rename"
                onMouseEnter={() => setDisplayAs(null)}
              onClick={() => {
                setRenamingId(menu.viewId);
                setMenu(null);
              }}
            />
            <ContextMenuItem
              icon={<PaintBrushIcon />}
              label="Display as"
              trailing={
                <ChevronRightSmallIcon className="size-4 text-muted-foreground" />
              }
              // Alt menü, tetikleyen SATIRIN sağ kenarına hizalanır —
              // sabit piksel tahmini ya da fare konumu değil.
              onMouseEnter={openDisplayAs}
              onClick={openDisplayAs}
            />
            {onEditView && (
              <ContextMenuItem
                icon={<SlidersLargeIcon />}
                label="Edit view"
                onMouseEnter={() => setDisplayAs(null)}
                onClick={() => {
                  onEditView();
                  setMenu(null);
                }}
              />
            )}
            {databaseTitle && (
              <ContextMenuItem
                icon={<PathRoundEndsIcon />}
                label="Source"
                onMouseEnter={() => setDisplayAs(null)}
                // Notion'da bu satır kaynağı DEĞİŞTİREN bir alt menü açıyor.
                // Bizde view kaynak dokümana ait olduğu için kaynak
                // değiştirmek view'ı o sayfadan taşırdı — kullanıcı kararıyla
                // bu özellik EKLENMEDİ. Chevron yok: olmayan bir yeteneği
                // vaat etmesin. Satır yalnızca kaynağı gösteriyor.
                trailing={
                  <span className="max-w-[90px] truncate text-[12px] text-muted-foreground">
                    {databaseTitle}
                  </span>
                }
                disabled
              />
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={<NotionLinkIcon />}
              label="Copy link to view"
                onMouseEnter={() => setDisplayAs(null)}
              onClick={() => {
                onCopyLink(menu.viewId);
                setMenu(null);
              }}
            />
            <ContextMenuSeparator />
            <ContextMenuItem
              icon={<DuplicateIcon />}
              label="Duplicate view"
                onMouseEnter={() => setDisplayAs(null)}
              onClick={() => {
                onDuplicate(menu.viewId);
                setMenu(null);
              }}
            />
            <ContextMenuItem
              icon={<TrashIcon />}
              label="Delete view"
                onMouseEnter={() => setDisplayAs(null)}
              disabled={views.length <= 1}
              onClick={() => {
                onDelete(menu.viewId);
                setMenu(null);
              }}
            />
          </>
        )}
      </ContextMenu>

      <ContextMenu
        open={displayAs !== null && menu !== null}
        x={displayAs?.x ?? 0}
        y={displayAs?.y ?? 0}
        // Notion ölçüsü: alt menü de 220px.
        className="w-[220px]"
        rootRef={submenuRef}
        onClose={() => setDisplayAs(null)}
      >
        {menu &&
          TAB_DISPLAY_OPTIONS.map((option) => {
            const current =
              (views.find((v) => v._id === menu.viewId)?.tabDisplay ??
                "textAndIcon") === option.value;
            return (
              <ContextMenuItem
                key={option.value}
                // Notion'da bu satırlarda İKON YOK — yalnızca etiket ve
                // seçili olanda sağda bir onay işareti.
                label={option.label}
                trailing={
                  current ? (
                    <CheckmarkSmallIcon className="size-4 text-muted-foreground" />
                  ) : undefined
                }
                onClick={() => {
                  updateViewSettings({
                    viewId: menu.viewId,
                    tabDisplay: option.value,
                  }).catch(() =>
                    toast.error("View display could not be changed"),
                  );
                  setDisplayAs(null);
                  setMenu(null);
                }}
              />
            );
          })}
        <ContextMenuSeparator />
        {/* Notion'daki bilgi satırı. Zotion tek sahipli olduğu için ayar
            view kaydında duruyor; pratikte "yalnızca sana" ile aynı. */}
        <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
          Only applies to you
        </div>
      </ContextMenu>

      {editable && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Add view"
            className="text-muted-foreground hover:bg-secondary flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={() => onCreate("table")}>
            <Rows3 className="mr-2 h-4 w-4" />
            Table
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("board")}>
            <LayoutPanelLeft className="mr-2 h-4 w-4" />
            Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      )}
    </div>
  );
};