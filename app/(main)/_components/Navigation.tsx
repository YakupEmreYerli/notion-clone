"use client";

import React, {
  ComponentRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "usehooks-ts";
import { useParams, usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { DocumentList } from "./DocumentList";
import { Item } from "./Item";
import { UserItem } from "./UserItem";

import { MenuIcon } from "lucide-react";
import { PlusIcon } from "./icons/PlusIcon";
import { SidebarCollapseIcon } from "./icons/SidebarCollapseIcon";
import { MagnifyingGlassIcon } from "./icons/MagnifyingGlassIcon";
import { SlidersIcon } from "./icons/SlidersIcon";
import { TrashIcon } from "./icons/TrashIcon";
import { HomeIcon } from "./icons/HomeIcon";
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
import { FavoritesList } from "./FavoritesList";
import { ActionTooltip } from "@/components/action-tooltip";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useArchivingDoc } from "@/hooks/useArchivingDoc";
import NavDrawer from "./NavDrawer";

const SIDEBAR_DEFAULT_WIDTH = 270;
const SIDEBAR_MIN_WIDTH = 270;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_WIDTH_STORAGE_KEY = "zotion:sidebar-width";

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  if (
    !Number.isFinite(stored) ||
    stored < SIDEBAR_MIN_WIDTH ||
    stored > SIDEBAR_MAX_WIDTH
  ) {
    return SIDEBAR_DEFAULT_WIDTH;
  }
  return stored;
}

const Navigation = () => {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const sidebarDefaultWidth = `${sidebarWidth}px`;
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 1020px)");

  const search = useSearch();
  const settings = useSettings();
  const newPage = useNewPage();

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

  useEffect(() => {
    if (archivingId && archivingId !== params.documentId) {
      clearArchiving();
    }
  }, [archivingId, params.documentId, clearArchiving]);

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

    if (newWidth < SIDEBAR_MIN_WIDTH) newWidth = SIDEBAR_MIN_WIDTH;
    if (newWidth > SIDEBAR_MAX_WIDTH) newWidth = SIDEBAR_MAX_WIDTH;

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

    const finalWidth = sidebarRef.current
      ? parseInt(sidebarRef.current.style.width, 10)
      : NaN;
    if (Number.isFinite(finalWidth)) {
      setSidebarWidth(finalWidth);
      window.localStorage.setItem(
        SIDEBAR_WIDTH_STORAGE_KEY,
        String(finalWidth),
      );
    }
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
      setTimeout(() => setIsResetting(false), 200);
    }
  }

  function collapse() {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true);
      setIsResetting(true);

      sidebarRef.current.style.width = "0";
      navbarRef.current.style.setProperty("width", "100%");
      navbarRef.current.style.setProperty("left", "0");
      setTimeout(() => setIsResetting(false), 200);
    }
  }

  useLayoutEffect(() => {
    setSidebarWidth(readStoredSidebarWidth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (isMobile) {
      collapse();
    } else {
      resetWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, sidebarDefaultWidth]);

  const isHomeActive = pathname === "/documents";

  return (
    <>
      <aside
        ref={sidebarRef}
        data-sidebar-root
        className={cn(
          "group/sidebar relative z-[300] flex h-full w-[var(--sidebar-default-width)] flex-col overflow-hidden overflow-x-hidden border-r border-sidebar-border bg-sidebar font-[Inter,var(--font-inter),-apple-system,BlinkMacSystemFont,sans-serif]",
          isResetting && "transition-[width] duration-200 ease-out",
          isMobile && "w-0 border-none",
        )}
        style={
          {
            "--sidebar-default-width": sidebarDefaultWidth,
          } as React.CSSProperties
        }
      >
        {/* Main scroll area - per spec: padding-top 6px */}
        <div className="sidebar-scroll flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Content - per spec: padding-inline 8px, padding-bottom 12px, gap 14px sections, gap 1px rows */}
          <div className="sidebar-content flex min-h-0 flex-1 flex-col gap-[14px]">
            {/* Workspace + Nav bar - spec ritmi: 6px top, 32px workspace pill, 6px mb,
                nav 8px py, 32px items, 8px pb. Divider/border YOK. */}
            <div className="flex flex-col">
              <div className="mb-[6px] flex items-center gap-[2px]">
                <div className="min-w-0 flex-1">
                  <UserItem />
                </div>
                <ActionTooltip label="Close sidebar (Ctrl + \)">
                  <button
                    type="button"
                    onClick={collapse}
                    aria-label="Close sidebar"
                    className={cn(
                      "flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-sidebar-muted transition-all duration-100 hover:bg-sidebar-hover hover:text-sidebar-text-active",
                      isMobile && "opacity-100",
                    )}
                  >
                    <SidebarCollapseIcon className="h-[16px] w-[16px]" />
                  </button>
                </ActionTooltip>
              </div>
              {/* sidebar-nav: py-8, sol 8px sidebar-content'ten, sağ 12px, gap 2px */}
              <div className="flex items-center gap-[2px] pt-[8px] pr-[12px]">
                <button
                  type="button"
                  onClick={() => router.push("/documents")}
                  aria-label="Home"
                  className={cn(
                    // sidebar-tab: 32px, gap 6px, pill 9999, subtle bg on active (no ring)
                    "flex h-[32px] shrink-0 items-center gap-[6px] rounded-full pl-[8px] pr-[12px] text-[14px] font-[500] transition-colors duration-100 ease-out",
                    isHomeActive
                      ? "bg-sidebar-accent text-sidebar-text-active hover:bg-sidebar-accent"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active",
                  )}
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center">
                    <HomeIcon className="h-[20px] w-[20px]" />
                  </span>
                  <span className="truncate">Home</span>
                </button>
                <div className="ml-auto flex items-center gap-[2px]">
                  <ActionTooltip label="Search (Ctrl + K)">
                    <button
                      type="button"
                      onClick={search.onOpen}
                      aria-label="Search"
                      className="flex h-[32px] w-[32px] min-w-[32px] items-center justify-center rounded-full text-sidebar-icon transition-colors duration-100 hover:bg-sidebar-hover hover:text-sidebar-text-active"
                    >
                      <MagnifyingGlassIcon className="h-[20px] w-[20px]" />
                    </button>
                  </ActionTooltip>
                </div>
              </div>
            </div>

            {/* Favorites + Private - section spacing 14px, gap 1px per spec */}
            <div className="flex min-h-0 flex-1 flex-col gap-[14px]">
              <FavoritesList />

              <div className="mb-[12px] flex min-h-0 flex-1 flex-col gap-[1px]">
                {/* Section header - spec: height 30, padding-inline 8, gap 4, radius 6, font 12/500 line-height 1 */}
                <div className="sidebar-section-header group/section flex h-[30px] items-center gap-[4px] rounded-[6px] px-[8px]">
                  <p className="flex-1 truncate text-[12px] font-[500] leading-[1] text-sidebar-muted whitespace-nowrap overflow-hidden text-ellipsis">
                    Private
                  </p>
                  <ActionTooltip label="Add a page">
                      <button
                        type="button"
                        onClick={newPage.onOpen}
                        aria-label="Add a page"
                        className="flex h-[20px] w-[20px] items-center justify-center rounded-full text-sidebar-muted opacity-0 invisible transition-all duration-100 hover:bg-sidebar-hover hover:text-sidebar-text-active group-hover/section:visible group-hover/section:opacity-100"
                      >
                        <PlusIcon className="h-[16px] w-[16px]" />
                      </button>
                    </ActionTooltip>
                </div>

                {/* Page tree - spec: flex-col gap 1px, 8px nested indent step */}
                <div className="flex min-h-0 flex-1 flex-col gap-[1px] overflow-hidden">
                  <div className="min-h-0 flex-1">
                    <DocumentList />
                  </div>
                  <div className="flex flex-col gap-[1px]">
                    {/* Add New - spec: height 30 min 27 padding 4/5 8 font 14/500 radius 6, icon box 22x22 mr 8 radius 4, plus icon well placed 16px centered */}
                    <Item onClick={newPage.onOpen} icon={PlusIcon} label="New page" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Trash, Settings - gap 1px, section bottom 12px */}
        <div className="sidebar-content flex shrink-0 flex-col gap-[1px] border-t border-sidebar-border pb-[12px] pt-[6px]">
          <Popover>
            <PopoverTrigger className="w-full">
              <Item label="Trash" icon={TrashIcon} />
            </PopoverTrigger>
            <PopoverContent
              side={isMobile ? "bottom" : "right"}
              className="w-72 border-sidebar-border bg-popover p-0 text-popover-foreground"
              collisionPadding={16}
            >
              <TrashBox />
            </PopoverContent>
          </Popover>
          <Item label="Settings" icon={SlidersIcon} onClick={settings.onOpen} />
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          onClick={resetWidth}
          className="absolute right-0 top-0 h-full w-[3px] cursor-ew-resize bg-transparent opacity-0 transition-all hover:bg-sidebar-hover group-hover/sidebar:opacity-100"
        />
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
          !isResizing && "transition-all duration-200 ease-out",
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
                <button
                  onClick={resetWidth}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] hover:bg-accent"
                >
                  <MenuIcon className="h-5 w-5 text-muted-foreground" />
                </button>
              </ActionTooltip>
            )}
          </nav>
        )}
      </div>
      <style jsx global>{`
        [data-sidebar-root] .group\\/section:hover .group\\/section-btn,
        [data-sidebar-root]:hover .group\\/section-btn {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
};
export default Navigation;
