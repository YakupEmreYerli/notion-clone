"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import {
  Check,
  ChevronDown,
  File,
  LayoutPanelLeft,
  MoveDiagonal,
  PanelRight,
  Rows,
  SquareArrowOutUpRight,
  Star,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/action-tooltip";
import { Menu } from "@/app/(main)/_components/Menu";
import { Publish } from "@/app/(main)/_components/Publish";
import { DocumentView } from "@/components/document-view";
import { PagePicker } from "@/components/page-picker";
import { usePeek, PeekMode } from "@/hooks/usePeek";
import { api } from "@/convex/_generated/api";
import { cn, getDocumentLabel } from "@/lib/utils";

const MODE_OPTIONS: { mode: PeekMode; label: string; icon: typeof Rows }[] = [
  { mode: "side", label: "Side peek", icon: PanelRight },
  { mode: "center", label: "Center peek", icon: LayoutPanelLeft },
  { mode: "full", label: "Full page", icon: Rows },
  { mode: "tab", label: "New tab", icon: SquareArrowOutUpRight },
];

export const PeekModal = () => {
  const router = useRouter();
  const peek = usePeek();
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const update = useMutation(api.documents.update);
  const remove = useMutation(api.documents.remove);

  const document = useQuery(
    api.documents.getById,
    peek.documentId ? { documentId: peek.documentId } : "skip",
  );

  const isOpen = !!peek.documentId;

  // Notion'da doğrulanan davranış: sidebar'daki "+" ile açılan alt sayfa
  // peek'i, başlıksız ve içeriksizken (Escape/backdrop ile) kapatılırsa
  // sessizce silinir. Sadece bu akıştan (peek.pendingEmptyId) gelen
  // dokümanlar için çalışır — Alt+Click veya "Open in side peek" ile açılan
  // var olan sayfalar asla buradan silinmez. "Full page"/"New tab" ile aynı
  // dokümana geçiş bu temizliği tetiklemez (onOpenAsPage/onSelectMode ayrı
  // yollardan peek.onClose çağırır, bu fonksiyonu kullanmaz).
  const closeWithCleanup = () => {
    const shouldCleanup =
      document &&
      peek.pendingEmptyId === document._id &&
      !document.title?.trim() &&
      !document.content;

    if (shouldCleanup) {
      remove({ id: document._id });
    }

    peek.onClose();
  };

  const onSelectMode = (mode: PeekMode) => {
    if (!peek.documentId) return;

    // Full page / New tab tek seferlik bir aksiyondur — sonraki "Add
    // sub-page" tıklamasının varsayılan modunu değiştirmez, kalıcı olarak
    // saklanmaz.
    if (mode === "full") {
      router.push(`/documents/${peek.documentId}`);
      peek.onClose();
      return;
    }

    if (mode === "tab") {
      window.open(`/documents/${peek.documentId}`, "_blank");
      peek.onClose();
      return;
    }

    peek.setMode(mode);
  };

  const onOpenAsPage = () => {
    if (!peek.documentId) return;
    router.push(`/documents/${peek.documentId}`);
    peek.onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeWithCleanup()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName={cn(
          "bg-transparent",
          peek.mode === "center" && "backdrop-blur-[2px] bg-black/15",
        )}
        className={cn(
          "bg-background dark:bg-dark flex flex-col gap-0 overflow-hidden p-0",
          peek.mode === "center" &&
            "top-1/2 h-[85vh] max-h-[85vh] w-[calc(100%-2rem)] max-w-4xl -translate-y-1/2 rounded-xl shadow-2xl sm:max-w-4xl",
          peek.mode === "side" &&
            "data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right top-0 right-0 left-auto h-full max-h-screen w-full max-w-160 translate-x-0 translate-y-0 rounded-none border-0 border-l shadow-none sm:max-w-160",
        )}
      >
        <DialogTitle className="sr-only">
          {getDocumentLabel(document?.title, document?.type)}
        </DialogTitle>
        {/* Ana uygulamadaki Navbar ile aynı: tek satır, aynı yükseklik
            (px-3 py-2.5 + h-9 buton = 56px) ve içeriğin ÜSTÜNE mutlak
            konumlanır. Böylece peek'teki kapak da tam sayfadaki gibi panelin
            en üstünden başlar, kapak/başlık/ikon hizası iki tarafta aynı olur.
            Breadcrumb ("Add to ...") de Navbar'daki gibi ayrı bir satır değil,
            aksiyon butonlarıyla aynı satırda. */}
        <div className="bg-background dark:bg-dark absolute inset-x-0 top-0 z-50 flex items-center justify-between gap-x-2 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-x-1">
            <ActionTooltip label="Open as page">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Open as page"
                onClick={onOpenAsPage}
              >
                <MoveDiagonal className="text-muted-foreground h-4 w-4" />
              </Button>
            </ActionTooltip>
            {document && peek.documentId && (
              <PagePicker
                excludeId={peek.documentId}
                onSelect={(parentDocument) => {
                  if (!parentDocument || !peek.documentId) return;
                  update({ id: peek.documentId, parentDocument });
                }}
              >
                <button
                  type="button"
                  className="text-muted-foreground/70 hover:text-foreground flex min-w-0 items-center gap-x-1 text-sm transition"
                >
                  <span className="shrink-0">Add to</span>
                  {document.icon ? (
                    <span className="shrink-0 leading-none">
                      {document.icon}
                    </span>
                  ) : (
                    <File className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {getDocumentLabel(document.title, document.type)}
                  </span>
                </button>
              </PagePicker>
            )}
          </div>
          {document && (
            <div className="flex shrink-0 items-center gap-x-1">
              <Publish initialData={document} />
              <ActionTooltip
                label={document.isFavorite ? "Unfavorite" : "Favorite"}
              >
                <Button
                  variant="ghost"
                  aria-label={document.isFavorite ? "Unfavorite" : "Favorite"}
                  onClick={() => toggleFavorite({ id: document._id })}
                >
                  <Star
                    className={cn(
                      "text-muted-foreground size-4.5",
                      document.isFavorite && "fill-yellow-400 text-yellow-400",
                    )}
                  />
                </Button>
              </ActionTooltip>
              <DropdownMenu>
                <ActionTooltip label="Peek mode">
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Peek mode">
                      <LayoutPanelLeft className="text-muted-foreground h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </ActionTooltip>
                <DropdownMenuContent align="end" className="w-45">
                  {MODE_OPTIONS.map(({ mode, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={mode}
                      onClick={() => onSelectMode(mode)}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      {peek.mode === mode && <Check className="h-3.5 w-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Menu documentId={document._id} />
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {peek.documentId && (
            <DocumentView
              documentId={peek.documentId}
              managesDocumentChrome={false}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
