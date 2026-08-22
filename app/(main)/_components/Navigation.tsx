"use client";

import React, {
  ComponentRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import { useParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { DocumentList } from "./DocumentList";
import { Item } from "./Item";
import { UserItem } from "./UserItem";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useSidebarDragAndDrop } from "@/hooks/useSidebarDragAndDrop";

import {
  ChevronsLeft,
  MenuIcon,
  Notebook,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrashBox } from "./TrashBox";
import { useSearch } from "@/hooks/useSearch";
import { useNewPage } from "@/hooks/useNewPage";
import { useSettings } from "@/hooks/useSettingsModal";
import { Navbar } from "./Navbar";
import { ScrollableList } from "@/components/scrollable-list";
import { FavoritesList } from "./FavoritesList";
import { ActionTooltip } from "@/components/action-tooltip";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useArchivingDoc } from "@/hooks/useArchivingDoc";
import NavDrawer from "./NavDrawer";

const SIDEBAR_DEFAULT_WIDTH = 280;
const SIDEBAR_DEFAULT_WIDTH_CSS = `${SIDEBAR_DEFAULT_WIDTH}px`;

const Navigation = () => {
  const sidebarDefaultWidth = SIDEBAR_DEFAULT_WIDTH_CSS;
  const params = useParams();
  const pathname = usePathname();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1020px)");

  const search = useSearch();
  const settings = useSettings();
  const newPage = useNewPage();
  const sidebarDnd = useSidebarDragAndDrop();

  const { focusMode, setFocusMode } = useFocusMode();
  const archivingId = useArchivingDoc((state) => state.archivingId);
  const clearArchiving = useArchivingDoc((state) => state.clearArchiving);
  const prevFocusMode = useRef(focusMode);

  const isResizingRef = useRef(false);
  const sidebarRef = useRef<ComponentRef<"aside">>(null);
  const navbarRef = useRef<ComponentRef<"div">>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  const [isNavbarHovered, setIsNavbarHovered] = useState(false);

  useEffect(() => {
    if (isMobile) {
      collapse();
    }
  }, [pathname, isMobile]);

  // arşivleme sonrası navigasyon tamamlandığında çöp kutusu bandını serbest bırak
  useEffect(() => {
    if (archivingId && archivingId !== params.documentId) {
      clearArchiving();
    }
  }, [archivingId, params.documentId, clearArchiving]);

  // focus mode effects
  useEffect(() => {
    if (isMobile) return;

    if (focusMode && params.documentId) {
      collapse();
    } else if (!focusMode && prevFocusMode.current && params.documentId) {
      resetWidth();
    } else if (!isCollapsed) {
      resetWidth();
    }

    prevFocusMode.current = focusMode;
    // Bu efektler layout fonksiyonlarını kasıtlı olarak güncel state ile çağırır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.documentId, focusMode, isMobile, isCollapsed]);

  useEffect(() => {
    if (!navbarRef.current) return;

    if (
      focusMode &&
      params.documentId &&
      !isNavbarHovered &&
      isCollapsed &&
      !isMobile
    ) {
      setTimeout(
        () => navbarRef.current?.style.setProperty("opacity", "0"),
        400,
      );
    } else {
      navbarRef.current.style.removeProperty("opacity");
    }
  }, [focusMode, params.documentId, isMobile, isNavbarHovered, isCollapsed]);

  // key binds effects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        isCollapsed ? resetWidth() : collapse();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setFocusMode(!focusMode);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    isResizingRef.current = true;
    setIsResizing(true);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    let newWidth = e.clientX;

    if (newWidth < SIDEBAR_DEFAULT_WIDTH) newWidth = SIDEBAR_DEFAULT_WIDTH;
    if (newWidth > 480) newWidth = 480;

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
      navbarRef.current.style.setProperty("left", `${newWidth}px`);
      navbarRef.current.style.setProperty(
        "width",
        `calc(100% - ${newWidth}px)`,
      );
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    setIsResizing(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  function resetWidth() {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false);
      setIsResetting(true);
      setTimeout(() => {
        if (sidebarRef.current && navbarRef.current) {
          sidebarRef.current.style.width = isMobile
            ? "100%"
            : sidebarDefaultWidth;
          navbarRef.current.style.removeProperty("width");
          navbarRef.current.style.setProperty(
            "width",
            isMobile ? "0" : `calc(100% - ${sidebarDefaultWidth})`,
          );
          navbarRef.current.style.setProperty(
            "left",
            isMobile ? "100%" : sidebarDefaultWidth,
          );
        }
      }, 0);
      setTimeout(() => setIsResetting(false), 300);
    }
  }

  function collapse() {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true);
      setIsResetting(true);

      sidebarRef.current.style.width = "0";
      navbarRef.current.style.setProperty("width", "100%");
      navbarRef.current.style.setProperty("left", "0");
      setTimeout(() => setIsResetting(false), 300);
    }
  }

  // Keep imperative styles in sync when a preserved client layout receives a
  // new default width (for example after a Fast Refresh).
  useLayoutEffect(() => {
    if (isMobile) {
      collapse();
    } else {
      resetWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, sidebarDefaultWidth]);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "group/sidebar bg-secondary relative z-300 flex h-full w-[var(--sidebar-default-width)] flex-col overflow-hidden overflow-x-hidden pb-4",
          isResetting && "transition-all duration-300 ease-in-out",
          isMobile && "w-0",
        )}
        style={
          {
            "--sidebar-default-width": sidebarDefaultWidth,
          } as React.CSSProperties
        }
      >
        <ActionTooltip label="Close sidebar (Ctrl + \)">
          <div
            onClick={collapse}
            role="button"
            aria-label="Close sidebar"
            className={cn(
              "text-muted-foreground absolute top-3 right-2 h-6 w-6 rounded-sm opacity-0 transition group-hover/sidebar:opacity-100 hover:bg-neutral-300 dark:hover:bg-neutral-600",
              isMobile && "opacity-100",
            )}
          >
            <ChevronsLeft className="h-6 w-6" />
          </div>
        </ActionTooltip>
        <div>
          <UserItem />
          <Item
            label="Search"
            icon={Search}
            onClick={search.onOpen}
            shortcut="Ctrl + K"
          />
          <Item label="Settings" icon={Settings} onClick={settings.onOpen} />
          <Item onClick={newPage.onOpen} label="New page" icon={PlusCircle} />
        </div>
        <div className="mt-4">
          <div>
            <ScrollableList>
              <FavoritesList />
              <div className="mt-3">
                <p className="text-muted-foreground/60 flex items-center px-4 py-1 text-[13px] font-medium">
                  <Notebook className="mr-1 size-3 shrink-0" />
                  Notes
                </p>
                <DndContext
                  sensors={sidebarDnd.sensors}
                  onDragStart={sidebarDnd.onDragStart}
                  onDragEnd={sidebarDnd.onDragEnd}
                  // restrictToParentElement KULLANMIYORUZ: sidebar ağacı çok
                  // seviyeli, her satırın DOM ebeveyni kendi seviyesindeki
                  // kardeş listesi. O modifier'la sürüklenen öğe görsel
                  // olarak kendi seviyesinin sınırlarının dışına hiç
                  // çıkamıyordu — bu da bir alt sayfayı üst seviyeye/başka
                  // bir ebeveyne sürükleyerek taşımayı (reparent) yapısal
                  // olarak imkânsız kılıyordu.
                  modifiers={[restrictToVerticalAxis]}
                  collisionDetection={closestCenter}
                >
                  <DocumentList />
                </DndContext>
              </div>
            </ScrollableList>
          </div>
          <Item onClick={newPage.onOpen} icon={Plus} label="Add a page" />
          <Popover>
            <PopoverTrigger className="mt-3 w-full">
              <Item label="Trash" icon={Trash} />
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
        <div
          onMouseDown={handleMouseDown}
          onClick={resetWidth}
          className="bg-primary/10 absolute top-0 right-0 h-full w-1 cursor-ew-resize opacity-0 transition group-hover/sidebar:opacity-100"
        ></div>
      </aside>
      {isCollapsed && isDesktop && !focusMode && (
        <NavDrawer resetWidth={resetWidth} isMobile={isMobile} />
      )}
      <div
        ref={navbarRef}
        onMouseEnter={() => setIsNavbarHovered(true)}
        onMouseLeave={() => setIsNavbarHovered(false)}
        className={cn(
          "absolute top-0 left-[var(--sidebar-default-width)] z-40 w-[calc(100%_-_var(--sidebar-default-width))]",
          !isResizing && "transition-all duration-300 ease-in-out",
          isMobile && "left-0 w-full",
        )}
        style={
          {
            "--sidebar-default-width": sidebarDefaultWidth,
          } as React.CSSProperties
        }
      >
        {!!params.documentId ? (
          (!isMobile || isCollapsed) && (
            <Navbar isCollapsed={isCollapsed} onResetWidth={resetWidth} />
          )
        ) : (
          <nav
            className={cn(
              "w-full bg-transparent px-3 py-2",
              !isCollapsed && "p-0",
            )}
          >
            {isCollapsed && (
              <ActionTooltip label="Open sidebar (Ctrl + \)">
                <button onClick={resetWidth}>
                  <MenuIcon className="text-muted-foreground h-6 w-6" />
                </button>
              </ActionTooltip>
            )}
          </nav>
        )}
      </div>
    </>
  );
};
export default Navigation;
