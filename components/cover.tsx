"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMediaQuery } from "usehooks-ts";
import { Button } from "./ui/button";
import { EllipsisVertical, ImageIcon, Move, X } from "lucide-react";
import { useCoverImage } from "@/hooks/useCoverImage";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { deleteFile, isFileUrl, isOptimizableImageUrl } from "@/lib/storage";
import { Skeleton } from "./ui/skeleton";
import { Spinner } from "./spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface CoverImageProps {
  documentId: Id<"documents">;
  url?: string;
  positionY?: number;
  preview?: boolean;
  /** Database sayfalarında Notion'ın daha ince cover oranını kullanır. */
  database?: boolean;
  /**
   * Peek modalı gibi dar alanlarda kapak YOKKEN boş bir şerit ayırmaz.
   * Kapak yüksekliğini etkilemez — kapak her yüzeyde aynı yükseklikte.
   */
  compact?: boolean;
}

export const Cover = ({
  documentId,
  url,
  positionY,
  preview,
  database,
  compact,
}: CoverImageProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isSavingPosition, setIsSavingPosition] = useState(false);

  const savedY = positionY ?? 50;
  const [draftY, setDraftY] = useState(savedY);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startClientY: number; startY: number } | null>(null);
  // object-position%'in taşan (crop edilen) piksel miktarına göre
  // normalize edilmesi için gerekli — bkz. onPointerDownDrag.
  const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);

  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    naturalSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight };
  };

  const coverImage = useCoverImage();
  const isOwnCoverModalOpen =
    coverImage.isOpen && coverImage.documentId === documentId;
  const { focusMode } = useFocusMode({ enabled: !preview });

  const update = useMutation(api.documents.update);
  const removeCoverImage = useMutation(api.documents.removeCoverImage);

  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  const onRemove = async () => {
    setIsRemoving(true);
    try {
      await removeCoverImage({
        id: documentId,
      });
      await deleteFile(url);
    } catch (err) {
      console.error("Failed to remove cover image:", err);
    } finally {
      setIsRemoving(false);
    }
  };

  const startReposition = () => {
    setDraftY(savedY);
    setIsRepositioning(true);
  };

  const onPointerDownDrag = (event: React.PointerEvent) => {
    if (!isRepositioning) return;
    event.preventDefault();

    dragRef.current = { startClientY: event.clientY, startY: draftY };

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      const height = containerRef.current?.offsetHeight;
      const width = containerRef.current?.offsetWidth;
      if (!drag || !height || !width) return;

      // Notion'da ölçüldü: object-position%, container yüksekliğine değil,
      // object-fit:cover'ın CROP ettiği (taşan) piksel miktarına göre
      // normalize ediliyor — CSS object-position spesifikasyonuyla aynı
      // taban. Container'a yakın en/boy oranlı bir görsel az taşar (aynı
      // sürükleme mesafesi büyük bir % sıçraması yapar); çok geniş/kısa bir
      // görsel çok taşar (aynı mesafe küçük bir % değişimi yapar). Doğal
      // boyut henüz yüklenmediyse container yüksekliğine düşülür.
      const natural = naturalSizeRef.current;
      let overflow = height;
      if (natural && natural.w > 0 && natural.h > 0) {
        const scale = Math.max(width / natural.w, height / natural.h);
        overflow = Math.max(1, natural.h * scale - height);
      }

      // Aşağı sürüklemek görseli aşağı taşır (görselin üstü görünür hale
      // gelir) — object-position Y%'i buna göre azaltıyoruz.
      const delta = ((moveEvent.clientY - drag.startClientY) / overflow) * 100;
      setDraftY(Math.max(0, Math.min(100, drag.startY - delta)));
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const onSavePosition = async () => {
    setIsSavingPosition(true);
    try {
      await update({
        id: documentId,
        coverImageY: draftY,
      });
      setIsRepositioning(false);
    } finally {
      setIsSavingPosition(false);
    }
  };

  const onCancelReposition = () => {
    setDraftY(savedY);
    setIsRepositioning(false);
  };

  const isUrl = isFileUrl(url);

  // The main navbar is absolutely positioned over the page content. Reserve
  // its full height when there is no cover so the toolbar is not painted
  // underneath it.
  if (!url && compact) return <div className="h-14 w-full" />;

  return (
    <div
      ref={containerRef}
      data-testid="page-cover"
      className={cn(
        "group relative z-10 w-full",
        // Notion database cover'ı normal sayfadaki 30vh yerine 20vh kullanır;
        // iki yüzey de yüksek ekranlarda aynı 280px cap'e ulaşır.
        url &&
          (database
            ? "bg-muted h-[min(20vh,280px)]"
            : "bg-muted h-[min(30vh,280px)]"),
        !url && !focusMode && "h-[12vh] md:h-[72px]",
        !url && focusMode && "h-20 md:h-20",
      )}
    >
      {!!url &&
        (isUrl ? (
          isOptimizableImageUrl(url) ? (
            <Image
              src={url}
              fill
              alt="cover"
              priority
              onLoad={onImageLoad}
              onPointerDown={onPointerDownDrag}
              style={{
                objectPosition: `center ${isRepositioning ? draftY : savedY}%`,
              }}
              className={cn(
                "object-cover",
                // Notion ölçümü: reposition sırasında cursor grab değil,
                // dikey-sadece taşımayı ifade eden ns-resize.
                isRepositioning && "cursor-ns-resize touch-none",
              )}
            />
          ) : (
            // next/image, next.config.mjs'de allowlist'lenmemiş bir host'tan
            // görsel istendiğinde crash ediyor (next-image-unconfigured-host).
            // Her olası host'u önceden eklemek pratik değil — bilinmeyen
            // host'lu bir kapak (ör. eski/manuel eklenmiş veri) burada
            // optimize edilmeden düz <img> ile gösteriliyor.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="cover"
              onLoad={onImageLoad}
              onPointerDown={onPointerDownDrag}
              style={{
                objectPosition: `center ${isRepositioning ? draftY : savedY}%`,
              }}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                isRepositioning && "cursor-ns-resize touch-none",
              )}
            />
          )
        ) : (
          <div className="h-full w-full" style={{ background: url }} />
        ))}

      {isRepositioning && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded bg-black/40 px-[18px] py-1 text-xs text-white">
              Drag image to reposition
            </span>
          </div>
          {/* Notion'un düz, bölünmüş metin pill'inden kasıtlı olarak
              ayrılıyoruz: iki ayrı yüzen cam-pill (Cancel / Save), her biri
              kendi rounded-full + ring + shadow'una sahip — tek bir uzun
              çubuk yerine iki net, dokunulabilir hedef. */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-x-2">
            {/* Ham <button> — shadcn ghost variant kullanılmaz: onun
                hover:bg-accent'ı bg-black/70'i ezip pill'i şeffaflaştırıyordu.
                Üstteki Change/Reposition grubu gibi ham buton + hover'da
                background-image olarak bindirilen white/15 overlay. */}
            <button
              type="button"
              onClick={onCancelReposition}
              disabled={isSavingPosition}
              className="h-8 rounded-full border border-white/15 bg-black/70 px-4 text-xs font-medium text-white/90 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-[linear-gradient(rgba(255,255,255,0.15),rgba(255,255,255,0.15))] hover:text-white disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSavePosition}
              disabled={isSavingPosition}
              className="h-8 rounded-full bg-black/70 px-4 text-xs font-medium text-white/90 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-[linear-gradient(rgba(255,255,255,0.15),rgba(255,255,255,0.15))] hover:text-white disabled:opacity-60"
            >
              {isSavingPosition ? <Spinner size="sm" /> : "Save position"}
            </button>
          </div>
        </>
      )}

      {/* Notion'un tek çubuk + ince ayraç düzenini kasıtlı olarak
          büyütüyoruz: her aksiyon kendi rounded-full hedefi olan, aralarında
          gerçek boşluk bırakan bir segmented pill grubu — daha net tıklama
          hedefleri, daha yumuşak (scale+opacity) beliriş, Remove için ayrı
          bir "tehlikeli aksiyon" hover rengi. */}
      {url && !preview && !isRepositioning && (canHover || isOwnCoverModalOpen) && (
        <div
          data-testid="page-cover-controls"
          className={cn(
            "absolute top-4 right-4 z-50 flex items-center gap-x-1 rounded-full bg-black/70 p-1",
            "shadow-lg ring-1 shadow-black/20 ring-white/10 backdrop-blur-md",
            "transition-[opacity,transform] duration-150 ease-out",
            isOwnCoverModalOpen
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100",
          )}
        >
          <button
            onClick={() => coverImage.onReplace(documentId, url)}
            className="flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
          >
            <ImageIcon className="size-3.5" />
            Change
          </button>
          {isUrl && (
            <button
              onClick={startReposition}
              className="flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
            >
              <Move className="size-3.5" />
              Reposition
            </button>
          )}
          <button
            onClick={onRemove}
            disabled={isRemoving}
            aria-label="Remove cover"
            className="flex size-7 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-red-500/20 hover:text-red-200"
          >
            {isRemoving ? <Spinner size="sm" /> : <X className="size-3.5" />}
          </button>
        </div>
      )}
      {url && !preview && !isRepositioning && !canHover && !isOwnCoverModalOpen && (
        <div className="absolute top-16 right-3 z-50 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground dark:bg-dark flex size-8 items-center justify-center rounded-full bg-white p-1 text-xs">
                <EllipsisVertical className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" alignOffset={7} sideOffset={5}>
              <DropdownMenuItem
                onClick={() => coverImage.onReplace(documentId, url)}
              >
                <ImageIcon className="h-4 w-4" />
                Change cover
              </DropdownMenuItem>
              {isUrl && (
                <DropdownMenuItem onClick={startReposition}>
                  <Move className="h-4 w-4" />
                  Reposition
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onRemove} disabled={isRemoving}>
                <X className="h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

Cover.Skeleton = function CoverSkeleton() {
  return <Skeleton className="h-[12vh] w-full" />;
};
