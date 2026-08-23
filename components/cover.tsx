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
  compact,
}: CoverImageProps) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isSavingPosition, setIsSavingPosition] = useState(false);

  const savedY = positionY ?? 50;
  const [draftY, setDraftY] = useState(savedY);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startClientY: number; startY: number } | null>(null);

  const coverImage = useCoverImage();
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
      if (!drag || !height) return;

      // Aşağı sürüklemek görseli aşağı taşır (görselin üstü görünür hale
      // gelir) — object-position Y%'i buna göre azaltıyoruz.
      const delta = ((moveEvent.clientY - drag.startClientY) / height) * 100;
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
      className={cn(
        "group relative z-10 w-full",
        // Kapak yüksekliği tek bir değer: sayfa, database, preview ve peek
        // aynı görünsün diye yüzeye göre değişmiyor.
        url && "bg-muted h-[280px]",
        !url && !focusMode && "h-[12vh] md:h-25",
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
              onPointerDown={onPointerDownDrag}
              style={{
                objectPosition: `center ${isRepositioning ? draftY : savedY}%`,
              }}
              className={cn(
                "object-cover",
                isRepositioning &&
                  "cursor-grab touch-none active:cursor-grabbing",
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
              onPointerDown={onPointerDownDrag}
              style={{
                objectPosition: `center ${isRepositioning ? draftY : savedY}%`,
              }}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                isRepositioning &&
                  "cursor-grab touch-none active:cursor-grabbing",
              )}
            />
          )
        ) : (
          <div className="h-full w-full" style={{ background: url }} />
        ))}

      {isRepositioning && (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-black/60 px-3 py-1.5 text-xs text-white">
              Drag image to reposition
            </span>
          </div>
          {/* Diğer kapak overlay kontrolleri (Change/Reposition/Remove) sabit
              koyu/cam bir pill (bg-black/80 + backdrop-blur-sm) kullanıyor —
              hangi kapak görseli veya uygulama teması olursa olsun okunaklı
              kalıyor. Bu iki buton eskiden generic, temaya göre değişen
              shadcn stilini kullanıyordu; aynı cam-pill diline geçirildi. */}
          <div className="absolute top-16 right-3 z-50 flex items-center gap-x-2">
            <Button
              onClick={onCancelReposition}
              variant="ghost"
              size="sm"
              className="h-8 rounded-md bg-black/80 text-xs text-white shadow-sm backdrop-blur-sm hover:bg-black/70 hover:text-white"
              disabled={isSavingPosition}
            >
              Cancel
            </Button>
            <Button
              onClick={onSavePosition}
              variant="ghost"
              size="sm"
              className="h-8 rounded-md bg-white text-xs text-black shadow-sm hover:bg-white/90 hover:text-black"
              disabled={isSavingPosition}
            >
              {isSavingPosition ? <Spinner size="sm" /> : "Save position"}
            </Button>
          </div>
        </>
      )}

      {url && !preview && !isRepositioning && canHover && (
        <div className="absolute top-16 right-3 z-50 flex h-8 items-center divide-x divide-white/15 overflow-hidden rounded-md bg-black/80 text-xs font-medium text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 ease-out group-hover:opacity-100">
          <button
            onClick={() => coverImage.onReplace(documentId, url)}
            className="flex h-full items-center px-3 transition hover:bg-white/10"
          >
            Change
          </button>
          {isUrl && (
            <button
              onClick={startReposition}
              className="flex h-full items-center px-3 transition hover:bg-white/10"
            >
              Reposition
            </button>
          )}
          <button
            onClick={onRemove}
            disabled={isRemoving}
            aria-label="Remove cover"
            className="flex h-full items-center px-3 transition hover:bg-white/10"
          >
            {isRemoving ? <Spinner size="sm" /> : <X className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      {url && !preview && !isRepositioning && !canHover && (
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
