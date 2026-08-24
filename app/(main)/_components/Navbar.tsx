"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { MenuIcon, Star } from "lucide-react";
import { useParams } from "next/navigation";
import { Title } from "./Title";
import { Banner } from "./Banner";
import { Menu } from "./Menu";
import { Publish } from "./Publish";
import { Breadcrumb } from "./Breadcrumb";
import { ActionTooltip } from "@/components/action-tooltip";
import { Button } from "@/components/ui/button";
import { useArchivingDoc } from "@/hooks/useArchivingDoc";

interface NavbarProps {
  isCollapsed: boolean;
  onResetWidth: () => void;
}

export const Navbar = ({ isCollapsed, onResetWidth }: NavbarProps) => {
  const params = useParams();

  const archivingId = useArchivingDoc((state) => state.archivingId);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);
  const document = useQuery(api.documents.getById, {
    documentId: params.documentId as Id<"documents">,
  });

  const onToggleFavorite = () => {
    if (!document) return;
    toggleFavorite({ id: document._id });
  };

  if (document === undefined) {
    return (
      <nav className="bg-background dark:bg-dark flex h-11 w-full items-center justify-between px-3">
        <Title.Skeleton />
        <div className="flex items-center gap-x-2">
          <Menu.Skeleton />
        </div>
      </nav>
    );
  }

  if (document === null) {
    return null;
  }

  return (
    <>
      <div className="bg-background dark:bg-dark">
        <nav className="flex h-11 w-full items-center gap-x-2 px-3">
          {isCollapsed && (
            <ActionTooltip label="Open sidebar (Ctrl + \)">
              <button aria-label="Menu" onClick={onResetWidth}>
                <MenuIcon className="text-muted-foreground h-6 w-6" />
              </button>
            </ActionTooltip>
          )}
          <div className="flex w-full items-center justify-between">
            <div className="flex min-w-0 items-center gap-x-1">
              <Breadcrumb documentId={document._id} />
              <Title initialData={document} />
            </div>
            <div className="flex shrink-0 items-center gap-x-0.5">
              <Publish initialData={document} />
              <ActionTooltip
                label={document.isFavorite ? "Unfavorite" : "Favorite"}
              >
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={onToggleFavorite}
                  aria-label={document.isFavorite ? "Unfavorite" : "Favorite"}
                  className="size-7 rounded-[6px]"
                >
                  <Star
                    className={cn(
                      "text-muted-foreground size-4.5",
                      document.isFavorite && "fill-yellow-400 text-yellow-400",
                    )}
                  />
                </Button>
              </ActionTooltip>
              <Menu documentId={document._id} />
            </div>
          </div>
        </nav>
      </div>
      {document.isArchived && archivingId !== document._id && (
        <Banner documentId={document._id} />
      )}
    </>
  );
};
