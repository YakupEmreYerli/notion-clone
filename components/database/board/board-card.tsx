"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ArrowUpRight, Copy, MoreHorizontal, Pencil } from "lucide-react";
import { TrashIcon } from "@/app/(main)/_components/icons/TrashIcon";
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
    cardRect: { top: number; left: number; width: number },
  ) => void;
  suppressClickRef?: React.RefObject<boolean | null>;
}

export const BoardCard = ({
  row,
  groupKey,
  titleProperty,
  visibleProperties,
  groupColor,
  // Notion'ın board varsayılanı "Card preview: Page cover". Alan view'da
  // optional ve şu an onu YAZAN bir ayar UI'ı yok, yani her view'da
  // `undefined` geliyordu — varsayılanı burada vermezsek kapak hiçbir
  // zaman çizilmez.
  cardPreview = "cover",
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
          // Notion kartında da `user-select: none`. Olmadan sürükleme
          // sırasında başlık/rozet metni seçiliyor ve sürükleme tutukluyor.
          userSelect: "none",
        } as React.CSSProperties
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={
        onDragPointerDown
          ? (e) => {
              // Notion: kart TUTULDUĞU noktadan sürüklenir — sol-üst köşe
              // geçiliyor ki motor iki eksende de tutma ofsetini saklasın.
              const rect = surfaceRef.current?.getBoundingClientRect();
              onDragPointerDown(e, row._id, groupKey, {
                top: rect?.top ?? 0,
                left: rect?.left ?? 0,
                width: rect?.width ?? 0,
              });
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
                <TrashIcon className="mr-2 size-4" />
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
            // Kart `user-select: none` taşıyor (sürükleme için); başlık
            // düzenlenirken metin seçilebilmeli.
            className="w-full min-w-0 bg-transparent outline-none select-text"
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
        {/* Kapak. Satırlar artık kapak taşıyor (`databaseRows.coverImage`,
            `setRowCover`) — eskiden burada gri bir yer tutucu vardı.
            Notion ölçüsü: 148px yükseklik, object-fit cover, altında 1px
            ayraç. Kapak yoksa Notion'da da bu alan HİÇ çizilmez. */}
        {cardPreview === "cover" && row.coverImage && (
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: "var(--kanban-cover-h)",
              // Notion'da da kapak sarmalayıcısı `pointer-events: none`.
              // Şart: `<img>` tarayıcıda VARSAYILAN OLARAK sürüklenebilir,
              // kapaktan tutunca kartın pointer sürüklemesi yerine tarayıcının
              // kendi görsel sürüklemesi başlıyor ve kart sürüklenemiyordu.
              pointerEvents: "none",
            }}
          >
            {/* Göreli URL (`/api/files/...`) ya da galeri seçimiyle gelen
                harici URL — erişim kontrolü sunucuda. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.coverImage}
              alt=""
              draggable={false}
              className="h-full w-full object-cover select-none"
            />
            <div className="border-border absolute inset-x-0 bottom-0 border-b" />
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
          {/* Satır ikonu — Notion ölçüsü: 24x24 yuva, içinde 20x20, emoji
              14px, radius 5, sola -2px taşar, başlığa 4px boşluk, uzun
              başlıkta üste hizalanır. */}
          {row.icon && (
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center self-start rounded-[5px]"
              style={{ marginInline: "-2px 4px" }}
            >
              <span className="grid size-5 place-items-center text-[14px] leading-none">
                {row.icon}
              </span>
            </span>
          )}
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
