import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { UserItem } from "./UserItem";
import { ActionTooltip } from "@/components/action-tooltip";
import { Notebook, PlusCircle } from "lucide-react";
import { PlusIcon } from "./icons/PlusIcon";
import { SidebarCollapseIcon } from "./icons/SidebarCollapseIcon";
import { MagnifyingGlassIcon } from "./icons/MagnifyingGlassIcon";
import { SlidersIcon } from "./icons/SlidersIcon";
import { TrashIcon } from "./icons/TrashIcon";
import { FavoritesList } from "./FavoritesList";
import { DocumentList } from "./DocumentList";
import { Item } from "./Item";
import { TrashBox } from "./TrashBox";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { useSettings } from "@/hooks/useSettingsModal";

type NavDrawerProps = {
  resetWidth: () => void;
  isMobile: boolean;
};

const NavDrawer = ({ resetWidth, isMobile }: NavDrawerProps) => {
  const router = useRouter();

  const search = useSearch();
  const settings = useSettings();

  const [isEdgeHovered, setIsEdgeHovered] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const create = useMutation(api.documents.create);

  const { isInnerPopoverOpen, setInnerPopoverOpen } = useNavDrawer();
  const open = isEdgeHovered || isDrawerOpen || isInnerPopoverOpen;

  const handleCreate = () => {
    const promise = create({ title: "" }).then((documentId) =>
      router.push(`/documents/${documentId}?fresh=1`),
    );

    promise.catch(() => toast.error("Failed to create a note."));
  };

  return (
    <div>
      <Popover open={open}>
        <PopoverTrigger asChild>
          <span
            onMouseEnter={() => setIsEdgeHovered(true)}
            onMouseLeave={() => setTimeout(() => setIsEdgeHovered(false), 500)}
            className="absolute top-0 left-0 z-200 h-full w-3.5"
          ></span>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="center"
          sideOffset={-24}
          className="w-75 rounded-tl-none rounded-bl-none border border-sidebar-border bg-sidebar pt-2 pr-0 pb-3 pl-2 shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
          onMouseEnter={() => setIsDrawerOpen(true)}
          onMouseLeave={() => setIsDrawerOpen(false)}
        >
          <div className="relative flex items-center justify-between gap-2 px-1">
            <UserItem navDrawer />
            <ActionTooltip label="Lock sidebar open (Ctrl + \)">
              <button
                type="button"
                onClick={resetWidth}
                aria-label="Open full sidebar"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sidebar-icon transition-colors hover:bg-sidebar-hover hover:text-sidebar-text-active",
                )}
              >
                <SidebarCollapseIcon className="h-4 w-4 rotate-180" />
              </button>
            </ActionTooltip>
          </div>
          <div className="flex items-center justify-between gap-1 px-1 py-1">
            <div className="flex items-center gap-[1px]">
              <Item
                label="Search"
                icon={MagnifyingGlassIcon}
                onClick={search.onOpen}
                navDrawer
              />
              <Item
                label="New Page"
                icon={PlusCircle}
                onClick={handleCreate}
                navDrawer
              />
            </div>
            <ActionTooltip label="Settings">
              <div className="justify-end">
                <Item icon={SlidersIcon} onClick={settings.onOpen} navDrawer />
              </div>
            </ActionTooltip>
          </div>
          <div className="flex max-h-[65vh] flex-col gap-[12px] overflow-y-auto pb-[12px]">
            <FavoritesList navDrawer />
            <div className="flex flex-col gap-[1px]">
              <div className="flex h-[30px] items-center gap-[4px] rounded-[6px] px-[8px]">
                <Notebook className="size-[12px] shrink-0 text-sidebar-muted" />
                <p className="truncate text-[12px] font-[500] leading-[1] text-sidebar-muted whitespace-nowrap overflow-hidden text-ellipsis">
                  Notes
                </p>
              </div>
              <DocumentList navDrawer height={280} />
              <Item onClick={handleCreate} icon={PlusIcon} label="Add a page" />
            </div>
            <div className="flex flex-col gap-[1px] border-t border-sidebar-border pt-[6px]">
              <Popover onOpenChange={setInnerPopoverOpen}>
                <PopoverTrigger className="w-full">
                  <Item label="Trash" icon={TrashIcon} />
                </PopoverTrigger>
                <PopoverContent
                  side={isMobile ? "bottom" : "right"}
                  className="w-72 p-0"
                  collisionPadding={16}
                >
                  <TrashBox />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
export default NavDrawer;
