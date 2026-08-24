"use client";

import Image from "next/image";

import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";
import {
  COVER_COLOR_CATEGORY,
  GALLERY_CATEGORIES,
  LEGACY_COLOR_CATEGORY,
  NOTION_GALLERY_CATEGORIES,
} from "@/lib/coverGallery";

interface CoverGalleryProps {
  onSelect: (url: string) => void;
  selectedUrl?: string;
}

export const CoverGallery = ({ onSelect, selectedUrl }: CoverGalleryProps) => {
  return (
    <div
      data-cover-gallery
      className="h-[445px] overflow-x-hidden overflow-y-auto pr-[21px] pb-2 pl-4"
    >
      {[
        COVER_COLOR_CATEGORY,
        ...NOTION_GALLERY_CATEGORIES,
        ...GALLERY_CATEGORIES,
        LEGACY_COLOR_CATEGORY,
      ].map((category, categoryIndex) => (
        <section className="pb-[17px] first:pt-2.5" key={category.name}>
          <div className="mb-3 flex h-5 items-center text-xs font-medium">
            {category.sourceUrl ? (
              <a
                href={category.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:underline"
              >
                {category.name}
              </a>
            ) : (
              <span className="text-muted-foreground">{category.name}</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {category.images.map((image) => (
              <ActionTooltip
                key={image.url}
                label={
                  image.detail
                    ? `${image.label} — ${image.detail}`
                    : image.label
                }
              >
                <button
                  type="button"
                  onClick={() => onSelect(image.url)}
                  aria-label={image.label}
                  aria-pressed={selectedUrl === image.url}
                  className={cn(
                    "border-border relative h-16 min-w-0 overflow-hidden rounded-sm transition-opacity hover:opacity-85",
                    image.background && "border",
                    selectedUrl === image.url &&
                      "ring-2 ring-[#2383e2] ring-inset",
                  )}
                  style={
                    image.background
                      ? { background: image.background }
                      : undefined
                  }
                >
                  {!image.background && (
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      loading={categoryIndex === 0 ? "eager" : "lazy"}
                      sizes="(max-width: 375px) 72px, 119px"
                      className="rounded-sm object-cover"
                    />
                  )}
                </button>
              </ActionTooltip>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
