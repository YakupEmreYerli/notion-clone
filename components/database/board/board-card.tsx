"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import {
  ArrowUpRight,
  Copy,
  File,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DatabaseProperty, DatabaseRow } from "@/components/database/types";
import { isCellEmpty } from "@/components/database/view-operations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupColorVars } from "./board-colors";
import { PropertyValue } from "./property-value";

// Board kartı — Notion ölçümleriyle birebir:
// yüzey: radius 10, kart gölgesi + 1px grup rengi halkası, overflow hidden.
// içerik: title satırı (pad 8px 10px 6px) + property satırları (pad-bottom 8).
// Drag: 8px eşiği altında pointerdown → tık (onOpen), üstü → drag (motor).
interface BoardCardProps {
  row: DatabaseRow;
  groupKey: string;
  titleProperty?: DatabaseProperty;
  visibleProperties: DatabaseProperty[];
  groupColor?: string;
  cardPreview?: "none" | "cover" | "content";
  onOpen?: (row: DatabaseRow) => void;
  onDragPointerDown?: (
    e: React.PointerEvent,
    rowId: Id<"databaseRows">,
    groupKey: string,
    cardTop: number,
  ) => void;
  suppressClickRef?: React.RefObject<boolean | null>;
}

export const BoardCard = ({
  row,
  groupKey,
  titleProperty,
  visibleProperties,
  groupColor,
  cardPreview,
  onOpen,
  onDragPointerDown,
  suppressClickRef,
}: BoardCardProps) => {
  const [hovered, setHovered] = useState(false);
  // Menü açıkken ya da başlık düzenlenirken aksiyonlar görünür kalmalı; yoksa
  // fare portal'a geçtiği an kart mouseleave alıp onları kaybediyordu.
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const duplicateRow = useMutation(api.databases.duplicateRow);
  const deleteRow = useMutation(api.databases.deleteRow);
  const updateCell = useMutation(api.databases.updateCell);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const colors = groupColorVars(groupColor);

  const title = titleProperty ? row.cells[titleProperty._id] : undefined;
  const titleText =
    typeof title === "string" ? title : title == null ? "" : String(title);
  const commitTitle = (next: string) => {
    if (!titleProperty || next === titleText) return;
    updateCell({
      rowId: row._id,
      propertyId: titleProperty._id,
      value: next,
    }).catch(() => toast.error("Title could not be saved"));
  };

  const hasActions = Boolean(onOpen);
  const actionsVisible = hovered || menuOpen || editingTitle;
  const cardProperties = visibleProperties.filter(
    (property) => !isCellEmpty(row.cells[property._id]),
  );

  return (
    <div
      ref={surfaceRef}
      data-row-id={row._id}
      data-testid="board-card"
      className="mb-2"
      style={
        {
          position: "relative",
          backgroundColor: hovered
            ? colors.cardBgHover
            : colors.cardBg,
          borderRadius: "var(--kanban-card-radius)",
          boxShadow: "var(--kanban-card-shadow)",
          "--kanban-card-ring": colors.ring,
          transition: "background 0.1s ease-out",
          overflow: "hidden",
          touchAction: "none",
        } as React.CSSProperties
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={
        onDragPointerDown
          ? (e) => {
              const top = surfaceRef.current?.getBoundingClientRect().top ?? 0;
              onDragPointerDown(e, row._id, groupKey, top);
            }
          : undefined
      }
    >
      {/* Hover aksiyonları — Notion ölçümü (docs/notion-research/board-parity.md):
          TEK yuvarlak çip (radius 4, popover zemini, yumuşak gölge) içinde iki
          düz buton (29x24 pencil / 28x24 ellipsis), ikisi de saydam.
          Sürükleme butonu YOK: Notion'da kartın kendisi sürükleniyor. */}
      {hasActions && (
        <div
          data-testid="board-card-actions"
          onPointerDown={(event) => event.stopPropagation()}
          className={cn(
            "bg-popover absolute top-2 right-2 z-10 flex h-6 items-center overflow-hidden rounded-[4px] shadow-[var(--popup-shadow)] transition-opacity duration-200",
            actionsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <button
            type="button"
            aria-label={editingTitle ? "Open in side peek" : "Edit title"}
            onMouseDown={(event) => {
              // Düzenleme açıkken preventDefault ŞART: yoksa input önce blur
              // olup editingTitle'ı false yapıyor, buton click gelmeden
              // pencil'a dönüyor ve side peek hiç açılmıyor.
              if (editingTitle) event.preventDefault();
            }}
            onClick={() => {
              // Notion: pencil başlığı yerinde düzenlemeye açar ve buton
              // side-peek'e dönüşür; ikinci tık peek'i açar.
              if (editingTitle) {
                commitTitle(titleInputRef.current?.value ?? titleText);
                setEditingTitle(false);
                onOpen?.(row);
                return;
              }
              setEditingTitle(true);
            }}
            className="text-muted-foreground hover:bg-accent flex h-6 w-[29px] items-center justify-center transition-colors"
          >
            {editingTitle ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </button>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Card actions"
                className="text-muted-foreground hover:bg-accent data-[state=open]:bg-accent flex h-6 w-7 items-center justify-center transition-colors"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onOpen?.(row)}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Open in side peek
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  duplicateRow({ rowId: row._id }).catch(() =>
                    toast.error("Row could not be duplicated"),
                  )
                }
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  deleteRow({ rowId: row._id }).catch(() =>
                    toast.error("Row could not be deleted"),
                  )
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Başlık düzenleme katmanı. Kart içeriği bir <button> içinde olduğu
          için input onun içine konulamaz (geçersiz HTML) — aynı padding'le
          başlık satırının üzerine bindiriliyor. */}
      {editingTitle && titleProperty && (
        <div
          // Katman aksiyon çipinin SOLUNDA biter. inset-x-0 + paddingRight
          // kullanmak kutuyu çipin altına kadar uzatıyor ve (z-20 > z-10)
          // side-peek butonunu tıklanamaz hale getiriyordu.
          className="absolute top-0 left-0 z-20 flex items-center"
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            right:
              "calc(var(--kanban-card-pad-x) + var(--kanban-card-actions-width))",
            padding:
              "var(--kanban-card-pad-top) 0 var(--kanban-card-pad-bottom) var(--kanban-card-pad-x)",
          }}
        >
          <input
            ref={titleInputRef}
            autoFocus
            defaultValue={titleText}
            aria-label="Card title"
            className="w-full min-w-0 bg-transparent outline-none"
            style={{
              fontSize: "var(--kanban-title-size)",
              fontWeight: "var(--kanban-title-weight)",
              lineHeight: 1.5,
              color: "var(--kanban-title-color)",
            }}
            onBlur={(event) => {
              commitTitle(event.target.value);
              setEditingTitle(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                // Kaydetmeden çık: blur commit etmesin diye önce değeri geri al.
                event.currentTarget.value = titleText;
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      )}

      <button
        type="button"
        className="block w-full cursor-pointer text-left outline-none"
        onClick={() => {
          // Drag eşiği aşıldıysa bu click'i yut.
          if (suppressClickRef?.current) {
            suppressClickRef.current = false;
            return;
          }
          onOpen?.(row);
        }}
      >
        {/* Cover preview — satırların sayfası olmadığı için (önceki karar)
            şimdilik cover gelmez; slot Faz 6'da per-row sayfa ile dolar. */}
        {cardPreview === "cover" && (
          <div
            className="w-full"
            style={{
              height: "var(--kanban-cover-h)",
              backgroundColor: "var(--muted)",
            }}
          >
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              <File className="mr-1 h-3 w-3" /> Cover
            </div>
          </div>
        )}

        {/* Title satırı */}
        <div
          className="flex items-center"
          style={{
            padding:
              "var(--kanban-card-pad-top) var(--kanban-card-pad-x) var(--kanban-card-pad-bottom)",
            paddingRight: hasActions
              ? "calc(var(--kanban-card-pad-x) + var(--kanban-card-actions-width))"
              : undefined,
          }}
        >
          <span
            data-testid="board-card-title"
            className="block min-w-0 flex-1 font-medium break-words"
            style={{
              fontSize: "var(--kanban-title-size)",
              fontWeight: "var(--kanban-title-weight)",
              lineHeight: 1.5,
              color: "var(--kanban-title-color)",
            }}
          >
            <span className={editingTitle ? "invisible" : undefined}>
              {titleText || <span className="opacity-50">Untitled</span>}
            </span>
          </span>
        </div>

        {/* Property satırları */}
        {cardProperties.length > 0 && (
          <div
            className="flex flex-col gap-y-1"
            style={{
              paddingBottom: 8,
              lineHeight: 1.5,
              marginInline: 0,
            }}
          >
            {cardProperties.map((property) => (
              <div
                key={property._id}
                className="flex items-center overflow-hidden"
                style={{
                  minHeight: "var(--kanban-prop-row-min-h)",
                  padding: "var(--kanban-prop-row-pad)",
                  borderRadius: "var(--kanban-prop-row-radius)",
                  marginInline: 6,
                  fontSize: "var(--kanban-card-prop-size)",
                }}
              >
                <PropertyValue property={property} row={row} />
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  );
};
