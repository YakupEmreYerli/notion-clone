"use client";

import Image from "next/image";

import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import { GALLERY_CATEGORIES } from "@/lib/coverGallery";

interface CoverGalleryProps {
  onSelect: (url: string) => void;
  selectedUrl?: string;
}

export const CoverGallery = ({ onSelect, selectedUrl }: CoverGalleryProps) => {
  return (
    <div className="max-h-[360px] space-y-4 overflow-y-auto p-2">
      {GALLERY_CATEGORIES.map((category) => (
        <div key={category.name}>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            {category.name}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {category.images.map((image) => (
              <ActionTooltip
                key={image.url}
                label={
                  image.detail ? `${image.label} — ${image.detail}` : image.label
                }
              >
                <button
                  onClick={() => onSelect(image.url)}
                  aria-label={image.label}
                  className={cn(
                    "border-border relative aspect-square overflow-hidden rounded-md border transition hover:opacity-80",
                    selectedUrl === image.url &&
                      "ring-primary ring-2 ring-offset-1",
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.label}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              </ActionTooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
