"use client";

import { useRef, useState } from "react";
import { ChevronsRight, ImageIcon, Maximize2, Minimize2, Copy, Pencil, Plus, Repeat2, Smile } from "lucide-react";
import { TrashIcon } from "@/app/(main)/_components/icons/TrashIcon";
import { CheckmarkSmallIcon } from "@/app/(main)/_components/icons/CheckmarkSmallIcon";
import { IconPicker } from "@/components/icon-picker";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DatabaseProperty,
  DatabaseRow,
  PropertyType,
} from "@/components/database/types";
import { PROPERTY_TYPE_OPTIONS } from "@/components/database/property-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PropertyValue } from "@/components/database/board/property-value";
import { SelectCell } from "@/components/database/select-cell";
import { PropertyIcon } from "@/components/database/property-icon";
import { MAX_RATIO, clampWidth, useRowPeekWidth } from "@/hooks/useRowPeekWidth";

/**
 * Side peek'in sunum katmanı — veriyi prop olarak alır.
 *
 * `RowPeekModal` Convex `useQuery`'ye bağlı olduğu için fixture'da render
 * edilemiyordu ve bu yüzden hiç testi yoktu. Panel ayrılınca hem gerçek
 * uygulamada hem izole fixture'da aynı bileşen çalışıyor.
 *
 * Ölçüler: docs/notion-research/board-parity.md
 */
interface RowPeekPanelProps {
  open: boolean;
  row?: DatabaseRow;
  properties?: DatabaseProperty[];
  onClose: () => void;
  onCommit: (propertyId: string, value: unknown) => void;
  /** Satır ikonunu (emoji) ayarlar; verilmezse ikon eklenemez. */
  onIconChange?: (icon: string | undefined) => void;
  /** Kapak seçiciyi açar (satır hedefiyle). */
  onAddCover?: () => void;
  onRemoveCover?: () => void;
  /** Veritabanına yeni bir property ekler. */
  onAddProperty?: () => void;
  /** Property etiketi menüsünün eylemleri (Notion: Rename / Edit / Duplicate / Delete). */
  propertyActions?: PropertyActions;
}

export interface PropertyActions {
  rename: (propertyId: string, name: string) => void;
  changeType: (propertyId: string, type: PropertyType) => void;
  duplicate: (propertyId: string) => void;
  remove: (propertyId: string) => void;
}

export const RowPeekPanel = ({
  open,
  row,
  properties,
  onClose,
  onCommit,
  onIconChange,
  onAddCover,
  onRemoveCover,
  onAddProperty,
  propertyActions,
}: RowPeekPanelProps) => {
  const { width, resizeTo } = useRowPeekWidth();
  const resizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const draftWidth = useRef<number | null>(null);

  // "Genişlet" butonu iki ölçü arasında gidip geliyor: Notion varsayılanı
  // (%48.5) ve neredeyse tam genişlik.
  const wide = width > (typeof window === "undefined" ? 0 : window.innerWidth) * 0.7;

  const titleProperty = properties?.find((p) => p.isTitle);
  const title = row && titleProperty ? row.cells[titleProperty._id] : undefined;
  const titleText = typeof title === "string" ? title : "";

  return (
    // modal={false} ŞART: Radix modal Dialog body'ye pointer-events:none
    // koyuyor — peek açıkken arkadaki board'da hiçbir hover/tık çalışmıyordu.
    // Notion'ın side peek'i de modal değil, arkasıyla etkileşilebiliyor.
    <Dialog open={open} modal={false} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-transparent"
        ref={panelRef}
        data-testid="row-peek"
        // Dışarı tık peek'i KAPATMAMALI: Notion'da panel açıkken arkadaki
        // board'la çalışmaya devam edebiliyorsun. Kapanış yalnızca Close
        // butonu ya da Escape ile.
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        style={{ width, maxWidth: "none" }}
        // Notion: yuzey --c-bacEle (yukseltilmis zemin), golge --c-shaOutMd;
        // sol kenarlik YOK, ayrimi golge yapiyor.
        className="bg-card top-0 right-0 left-auto flex h-full max-h-screen w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-[0_0_0_1px_var(--border),0_4px_12px_-2px_rgba(25,25,25,0.08)]"
      >
        {/* Genişlik tutamacı — Notion'da peek sol kenarından sürüklenerek
            daraltılıp genişletiliyor. Pointer capture şart: imleç 6px'lik
            şeridin dışına çıkınca olaylar başka elemana giderdi. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize side peek"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            resizing.current = true;
            // DialogContent'in kendi geçişi genişliği de animasyonluyor:
            // sürüklerken panel imlecin gerisinde kalıyor ("gecikmeli"
            // hissi). Sürükleme boyunca geçişi kapatıyoruz.
            if (panelRef.current) panelRef.current.style.transition = "none";
          }}
          onPointerMove={(event) => {
            if (!resizing.current || !panelRef.current) return;
            // Her harekette setState + localStorage yazmak sürüklemeyi
            // gözle görülür şekilde geciktiriyordu. Sürükleme boyunca
            // genişliği doğrudan DOM'a yazıyoruz; React state'i ve depolama
            // yalnızca bırakınca güncelleniyor.
            const next = clampWidth(window.innerWidth - event.clientX);
            draftWidth.current = next;
            panelRef.current.style.width = `${next}px`;
          }}
          onPointerUp={(event) => {
            resizing.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            if (panelRef.current) panelRef.current.style.transition = "";
            if (draftWidth.current !== null) {
              resizeTo(draftWidth.current);
              draftWidth.current = null;
            }
          }}
          onPointerCancel={() => {
            resizing.current = false;
            if (panelRef.current) panelRef.current.style.transition = "";
          }}
          className="hover:bg-primary/10 absolute inset-y-0 left-0 z-20 w-3 cursor-col-resize touch-none"
        />

        <DialogTitle className="sr-only">Row properties</DialogTitle>
        {/* Notion'da başlık çubuğunun SOL grubunda kapat ve peek modu
            butonları var (ölçüm: board-parity.md — hepsi 24x24). */}
        <div className="bg-card flex h-11 shrink-0 items-center gap-0.5 pr-2.5 pl-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary flex size-6 items-center justify-center rounded-md"
          >
            <ChevronsRight className="size-4" />
          </button>
          <button
            type="button"
            aria-label={wide ? "Shrink side peek" : "Expand side peek"}
            onClick={() => resizeTo(wide ? window.innerWidth * 0.485 : window.innerWidth * MAX_RATIO)}
            className="text-muted-foreground hover:bg-secondary flex size-6 items-center justify-center rounded-md"
          >
            {wide ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>

        {/* Notion: layout-side-peek padding-bottom 120px. */}
        <div className="group/peek min-h-0 flex-1 overflow-y-auto pb-[120px]">
          {!row || !properties ? (
            <div className="text-muted-foreground px-[76px] text-sm">Loading…</div>
          ) : (
            <>
              {/* Kapak. Yatay padding'in DIŞINDA — Notion'da kapak panelin
                  tam genişliğini kaplar. Değiştir/kaldır düğmeleri doküman
                  kapağındaki gibi yalnızca hover'da beliriyor. */}
              {row.coverImage && (
                // Notion olcumu: height 20vh, max-height 280px.
                <div className="group/cover relative mb-2 h-[20vh] max-h-[280px] w-full">
                  {/* Kapak göreli URL (`/api/files/...`) — erişim kontrolü
                      sunucuda, bkz. .claude/rules/project/convex.md. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.coverImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: "center 100%" }}
                  />
                  <div className="absolute right-3 bottom-3 flex gap-1 opacity-0 transition-opacity duration-100 group-hover/cover:opacity-100">
                    {onAddCover && (
                      <button
                        type="button"
                        onClick={onAddCover}
                        className="bg-background/80 text-muted-foreground hover:bg-background rounded-md px-2 py-1 text-xs backdrop-blur-sm"
                      >
                        Change cover
                      </button>
                    )}
                    {onRemoveCover && (
                      <button
                        type="button"
                        onClick={onRemoveCover}
                        className="bg-background/80 text-muted-foreground hover:bg-background rounded-md px-2 py-1 text-xs backdrop-blur-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Notion layout: icerik kolonu iki yanda 76px margin ile
                  (--margin-width: 76px). */}
              <div className="px-[76px]">
              {/* Sayfa kontrolleri — Notion'da yalnızca hover'da beliriyor
                  (opacity 0 → 1, 100ms), yükseklik 4px/4px padding. */}
              <div className="flex gap-1 py-1 opacity-0 transition-opacity duration-100 group-hover/peek:opacity-100">
                {onIconChange && !row.icon && (
                  <IconPicker asChild onChange={(icon) => onIconChange(icon)}>
                    <button
                      type="button"
                      className="text-muted-foreground hover:bg-secondary flex h-6 items-center gap-1.5 rounded-md px-1.5 text-sm"
                    >
                      <Smile className="size-4" /> Add icon
                    </button>
                  </IconPicker>
                )}
                {onAddCover && !row.coverImage && (
                  <button
                    type="button"
                    onClick={onAddCover}
                    className="text-muted-foreground hover:bg-secondary flex h-6 items-center gap-1.5 rounded-md px-1.5 text-sm"
                  >
                    <ImageIcon className="size-4" /> Add cover
                  </button>
                )}
              </div>

              {/* İkon — Notion: 36x36, font-size 36, radius .25em, ml 8px. */}
              {row.icon && onIconChange && (
                <IconPicker asChild onChange={(icon) => onIconChange(icon)} onRemove={() => onIconChange(undefined)}>
                  <button
                    type="button"
                    aria-label="Change row icon"
                    className="hover:bg-secondary ml-2 flex size-9 items-center justify-center rounded-[0.25em] text-[36px] leading-none"
                  >
                    {row.icon}
                  </button>
                </IconPicker>
              )}

              {/* Başlık — Notion: 32px / 700 / line-height 1.2, padding-inline 8. */}
              <input
                value={titleText}
                placeholder="Untitled"
                aria-label="Row title"
                onChange={(event) =>
                  titleProperty && onCommit(titleProperty._id, event.target.value)
                }
                className="text-foreground placeholder:text-muted-foreground/40 mb-3 w-full bg-transparent px-2 text-[32px] leading-[1.2] font-bold outline-none"
              />
              <div className="space-y-1 text-sm">
                {properties
                  .filter((p) => !p.isTitle)
                  .map((property) => (
                    <RowPropertyEditor
                      key={property._id}
                      property={property}
                      row={row}
                      actions={propertyActions}
                      onCommit={(value) => onCommit(property._id, value)}
                    />
                  ))}
              </div>

              {/* Notion: h 34, 14px, tersiyer renk. Şu an yalnızca görsel —
                  peek satır şemasını değiştirmiyor. */}
              {onAddProperty && (
                <button
                  type="button"
                  onClick={onAddProperty}
                  className="text-muted-foreground hover:bg-secondary flex h-[34px] items-center gap-1.5 rounded-md px-1.5 text-sm"
                >
                  <Plus className="size-4" /> Add a property
                </button>
              )}

              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function RowPropertyEditor({
  property,
  row,
  actions,
  onCommit,
}: {
  property: DatabaseProperty;
  row: DatabaseRow;
  actions?: PropertyActions;
  onCommit: (value: unknown) => void;
}) {
  const value = row.cells[property._id];

  if (property.type === "text") {
    return (
      <div className="flex items-center gap-1">
        <PropertyLabel property={property} actions={actions} />
        <input
          value={typeof value === "string" ? value : ""}
          placeholder="Empty"
          onChange={(e) => onCommit(e.target.value)}
          className="text-foreground hover:bg-secondary focus:bg-secondary ml-2 min-h-[34px] min-w-0 flex-1 rounded bg-transparent px-1.5 text-sm outline-none"
        />
      </div>
    );
  }

  if (property.type === "select" || property.type === "multiSelect") {
    // Rozetler artık TIKLANABİLİR: eskiden burada salt görünüm bir
    // OptionBadge ve yanında ayrı bir native <select> vardı, multiSelect ise
    // hiç düzenlenemiyordu. Tablo görünümünün editörünü paylaşıyoruz.
    return (
      <div className="flex items-center gap-1">
        <PropertyLabel property={property} actions={actions} />
        <div className="ml-2 flex min-h-[34px] min-w-0 flex-1 items-center rounded px-1.5">
          <SelectCell
            property={property}
            value={value as string | string[] | null | undefined}
            multiple={property.type === "multiSelect"}
            editable
            isActive
            isEditing={false}
            onCommit={(next) => onCommit(next)}
          />
        </div>
      </div>
    );
  }

  // Diğer tipler: salt görünüm (değer editörleri Faz 6'da genişler).
  return (
    <div className="flex items-center gap-1">
      <PropertyLabel property={property} actions={actions} />
      <div className="ml-2 flex min-h-[34px] min-w-0 flex-1 items-center rounded px-1.5">
        <PropertyValue property={property} row={row} />
      </div>
    </div>
  );
}

/**
 * Property etiketi — Notion'da tıklanabilir ve bir menü açar
 * (Rename / Edit property / Duplicate / Delete). Menü yoksa düz etiket.
 */
function PropertyLabel({
  property,
  actions,
  className,
}: {
  property: DatabaseProperty;
  actions?: PropertyActions;
  className?: string;
}) {
  const [renaming, setRenaming] = useState(false);

  const label = (
    <span className="flex min-w-0 items-center gap-1.5">
      <PropertyIcon property={property} className="size-4 shrink-0" />
      <span className="truncate">{property.name}</span>
    </span>
  );

  const base = `text-muted-foreground flex h-[34px] w-40 shrink-0 items-center rounded-md px-1.5 text-sm ${className ?? ""}`;

  if (!actions) return <span className={base}>{label}</span>;

  if (renaming) {
    return (
      <span className={base}>
        <input
          autoFocus
          defaultValue={property.name}
          aria-label="Property name"
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && next !== property.name) actions.rename(property._id, next);
            setRenaming(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              event.currentTarget.value = property.name;
              event.currentTarget.blur();
            }
          }}
          className="text-foreground min-w-0 flex-1 bg-transparent outline-none"
        />
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`${base} hover:bg-secondary text-left`}>
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuItem onClick={() => setRenaming(true)}>
          <Pencil className="mr-2 size-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Repeat2 className="mr-2 size-4" />
            Edit property
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.type}
                onClick={() => actions.changeType(property._id, option.type)}
              >
                <option.icon className="mr-2 size-4" />
                <span className="flex-1">{option.label}</span>
                {/* Hangi tipin YÜRÜRLÜKTE olduğu görünmüyordu; menü tamamen
                    işaretsizdi. Seçili tipte sağda onay işareti. */}
                {property.type === option.type && (
                  <CheckmarkSmallIcon className="text-muted-foreground ml-2 size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.duplicate(property._id)}>
          <Copy className="mr-2 size-4" />
          Duplicate property
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.remove(property._id)}>
          <TrashIcon className="mr-2 size-4" />
          Delete property
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
