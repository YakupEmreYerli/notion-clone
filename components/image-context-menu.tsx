"use client";

import { LinkIcon } from "@/app/(main)/_components/icons/LinkIcon";
import { TrashIcon } from "@/app/(main)/_components/icons/TrashIcon";
import {
  Captions,
  ChevronRight,
  Copy,
  CopyPlus,
  Download,
  FolderInput,
  ImagePlus,
  MessageSquare,
  MoreHorizontal,
  Repeat,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface ImageContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onCopyImage?: () => void;
  onDownload?: () => void;
  onCopyLink?: () => void;
  onDelete?: () => void;
}

/**
 * Notion tarzı image block context menu. Üstteki küçük image toolbar ile
 * karıştırılmaz — sağ tık ile açılan ikinci katman menüdür.
 *
 * Backend desteği olmayan aksiyonlar disabled bırakılır (sahte başarı
 * mesajı gösterilmez); gerçek olarak implement edilenler: copy image,
 * download, copy link to block, delete.
 */
export const ImageContextMenu = ({
  open,
  x,
  y,
  onClose,
  onCopyImage,
  onDownload,
  onCopyLink,
  onDelete,
}: ImageContextMenuProps) => {
  const closeAfter = (fn?: () => void) => () => {
    fn?.();
    onClose();
  };

  return (
    <ContextMenu open={open} x={x} y={y} onClose={onClose}>
      <ContextMenuLabel>Search actions…</ContextMenuLabel>
      <ContextMenuLabel className="pt-1.5">Image</ContextMenuLabel>

      <ContextMenuItem
        icon={<Repeat />}
        label="Turn into"
        trailing={<ChevronRight className="size-3.5" />}
        disabled
      />
      <ContextMenuItem icon={<ImagePlus />} label="Replace" disabled />
      <ContextMenuItem
        icon={<Copy />}
        label="Copy image"
        onClick={closeAfter(onCopyImage)}
      />
      <ContextMenuItem
        icon={<Download />}
        label="Download"
        onClick={closeAfter(onDownload)}
      />
      <ContextMenuItem icon={<Captions />} label="Caption" disabled />
      <ContextMenuItem
        icon={<MoreHorizontal />}
        label="More options"
        trailing={<ChevronRight className="size-3.5" />}
        disabled
      />

      <ContextMenuSeparator />

      <ContextMenuItem
        icon={<LinkIcon className="h-4 w-auto" />}
        label="Copy link to block"
        onClick={closeAfter(onCopyLink)}
      />
      <ContextMenuItem icon={<CopyPlus />} label="Duplicate" disabled />
      <ContextMenuItem icon={<FolderInput />} label="Move to" disabled />
      <ContextMenuItem
        icon={<TrashIcon className="size-4" />}
        label="Delete"
        onClick={closeAfter(onDelete)}
      />

      <ContextMenuSeparator />

      <ContextMenuItem icon={<MessageSquare />} label="Comment" disabled />
      <ContextMenuItem icon={<Sparkles />} label="Suggested edits" disabled />
      <ContextMenuItem icon={<Wand2 />} label="Ask AI" disabled />
    </ContextMenu>
  );
};

export default ImageContextMenu;