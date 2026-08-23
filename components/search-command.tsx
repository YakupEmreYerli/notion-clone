"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "usehooks-ts";
import { authClient } from "@/lib/auth-client";
import { Command as CommandPrimitive } from "cmdk";
import { Check, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSearch } from "@/hooks/useSearch";
import { useOrigin } from "@/hooks/useOrigin";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { cn, getDocumentLabel } from "@/lib/utils";
import { PageIcon } from "@/app/(main)/_components/icons/PageIcon";
import { DatabaseIcon } from "@/app/(main)/_components/icons/DatabaseIcon";
import { MagnifyingGlassIcon } from "@/app/(main)/_components/icons/MagnifyingGlassIcon";
import { SidebarRightIcon } from "@/app/(main)/_components/icons/SidebarRightIcon";
import { FilterCircleIcon } from "@/app/(main)/_components/icons/FilterCircleIcon";
import { TextFormatIcon } from "@/app/(main)/_components/icons/TextFormatIcon";
import { ChevronDownSmallIcon } from "@/app/(main)/_components/icons/ChevronDownSmallIcon";
import { PlusIcon } from "@/app/(main)/_components/icons/PlusIcon";
import { EnterIcon } from "@/app/(main)/_components/icons/EnterIcon";
import { LinkIcon } from "@/app/(main)/_components/icons/LinkIcon";
import { ArrowDiagonalUpRightIcon } from "@/app/(main)/_components/icons/ArrowDiagonalUpRightIcon";
import { SlidersIcon } from "@/app/(main)/_components/icons/SlidersIcon";

const DEBOUNCE_MS = 200;

/** BlockNote JSON `content` alanından düz metin önizleme çıkarır. */
function contentPreview(content: string | undefined): string {
  if (!content) return "";
  let blocks: unknown;
  try {
    blocks = JSON.parse(content);
  } catch {
    return "";
  }
  if (!Array.isArray(blocks)) return "";

  const out: string[] = [];
  const walk = (nodes: unknown) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node && typeof node === "object") {
        const item = node as {
          text?: string;
          content?: unknown;
          children?: unknown;
        };
        if (typeof item.text === "string" && item.text.length > 0) {
          out.push(item.text);
        }
        walk(item.content);
        walk(item.children);
      }
    }
  };
  walk(blocks);
  return out.join(" ").slice(0, 700);
}

type SearchBreadcrumb = {
  id: string;
  title: string;
  icon?: string;
  type?: "page" | "database";
};

type SearchResult = {
  _id: string;
  title: string;
  icon?: string;
  type?: "page" | "database";
  parentId?: string;
  breadcrumbs: SearchBreadcrumb[];
  createdAt: number;
  updatedAt?: number;
};

const chipBase =
  "inline-flex h-[24px] shrink-0 items-center justify-center gap-[6px] rounded-full px-2 text-[14px] whitespace-nowrap transition-colors duration-150 select-none text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.055)] hover:text-[#E6E6E6]";

const chipActive = "bg-[rgba(77,157,224,0.1)] text-[#5DB1FF]";

const pickerRow =
  "flex h-[30px] w-full cursor-pointer items-center gap-2 rounded-[6px] px-2 text-[13px] text-[#E6E6E6] transition-colors duration-150 hover:bg-[rgba(255,255,255,0.055)] data-[active=true]:bg-[rgba(255,255,255,0.07)]";

type Grouped = { label: string; items: SearchResult[] }[];

function groupByDate(docs: SearchResult[]): Grouped {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  const buckets: Record<string, SearchResult[]> = {
    Today: [],
    Yesterday: [],
    "Past week": [],
    Older: [],
  };

  for (const doc of docs) {
    const t = doc.updatedAt ?? doc.createdAt ?? 0;
    if (t >= todayStart) buckets.Today.push(doc);
    else if (t >= yesterdayStart) buckets.Yesterday.push(doc);
    else if (t >= weekStart) buckets["Past week"].push(doc);
    else buckets.Older.push(doc);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export const SearchCommand = () => {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();
  const origin = useOrigin();
  const isWide = useMediaQuery("(min-width: 1100px)");
  const [isMounted, setIsMounted] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Filtreler
  const [titleOnly, setTitleOnly] = useState(false);
  const [scopeId, setScopeId] = useState<Id<"documents"> | undefined>();
  const [scopeLabel, setScopeLabel] = useState<string | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Highlight/preview pane
  const [previewOpen, setPreviewOpen] = useState(true);
  const showPreview = previewOpen && isWide;

  const [selectedValue, setSelectedValue] = useState<string | undefined>();

  const toggle = useSearch((store) => store.toggle);
  const isOpen = useSearch((store) => store.isOpen);
  const onClose = useSearch((store) => store.onClose);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(rawQuery.trim()),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [rawQuery]);

  useEffect(() => {
    if (!isOpen) {
      setRawQuery("");
      setDebouncedQuery("");
      setTitleOnly(false);
      setScopeId(undefined);
      setScopeLabel(undefined);
      setSelectedValue(undefined);
    }
  }, [isOpen]);

  const hasQuery = debouncedQuery.length > 0;

  const recent = useQuery(
    api.documents.getRecentlyOpened,
    hasQuery ? "skip" : {},
  );
  const results = useQuery(
    api.documents.searchDocuments,
    hasQuery
      ? {
          query: debouncedQuery,
          titleOnly: titleOnly || undefined,
          scopeId,
        }
      : "skip",
  );

  const isLoading = hasQuery ? results === undefined : recent === undefined;
  const documents = (hasQuery ? results : recent) ?? undefined;

  // Preview için seçili sonuç — klavye ok tuşları / mouse hover cmdk
  // `value`'sini günceller, preview de aynı state'ten beslenir.
  const selectedResult = documents?.find((r) => r._id === selectedValue);

  const previewDoc = useQuery(
    api.documents.getById,
    selectedValue && showPreview
      ? { documentId: selectedValue as Id<"documents"> }
      : "skip",
  );

  // İlk sonuç otomatik seçili gelir (preview boş görünmesin).
  useEffect(() => {
    if (isOpen && documents && documents.length > 0 && !selectedValue) {
      setSelectedValue(documents[0]._id);
    }
  }, [isOpen, documents, selectedValue]);

  const previewTitle =
    selectedValue && previewDoc !== null && previewDoc !== undefined
      ? getDocumentLabel(previewDoc.title, previewDoc.type)
      : selectedResult
        ? getDocumentLabel(selectedResult.title, selectedResult.type)
        : "";
  const previewParentPath = selectedResult?.breadcrumbs
    .map((b) => getDocumentLabel(b.title, b.type))
    .join(" / ");
  const previewCover = previewDoc?.coverImage;
  const previewCoverY = previewDoc?.coverImageY ?? 50;
  const previewContent = contentPreview(previewDoc?.content);

  const groups: Grouped = useMemo(() => {
    if (!documents) return [];
    if (!hasQuery) {
      return documents.length > 0
        ? [{ label: "Recently opened", items: documents }]
        : [];
    }
    return groupByDate(documents);
  }, [documents, hasQuery]);

  // "In" picker için page tree
  const allDocs = useQuery(api.documents.getSearch);
  const scopeTree = useMemo(() => {
    if (!allDocs) return [];
    const byParent = new Map<string, Doc<"documents">[]>();
    for (const d of allDocs) {
      const key = d.parentDocument ?? "root";
      byParent.set(key, [...(byParent.get(key) ?? []), d]);
    }
    for (const siblings of byParent.values()) {
      siblings.sort((a, b) => {
        if (a.order === undefined && b.order === undefined) {
          return b._creationTime - a._creationTime;
        }
        if (a.order === undefined) return -1;
        if (b.order === undefined) return 1;
        return a.order - b.order;
      });
    }
    const out: (Doc<"documents"> & { depth: number })[] = [];
    const walk = (parentKey: string, depth: number) => {
      for (const doc of byParent.get(parentKey) ?? []) {
        out.push({ ...doc, depth });
        walk(doc._id, depth + 1);
      }
    };
    walk("root", 0);
    return out;
  }, [allDocs]);

  const onOpenDoc = (id: string) => {
    router.push(`/documents/${id}`);
    onClose();
  };

  const onCopyLink = async () => {
    if (!selectedValue) return;
    await navigator.clipboard.writeText(`${origin}/documents/${selectedValue}`);
  };

  const onOpenInNewTab = () => {
    if (!selectedValue) return;
    window.open(`/documents/${selectedValue}`, "_blank");
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      if (selectedValue) {
        window.open(`/documents/${selectedValue}`, "_blank");
        onClose();
      }
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search</DialogTitle>
        <DialogDescription>Search documents in workspace</DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-[9vh] flex h-[700px] max-h-[85vh] translate-y-0 flex-col items-stretch gap-0 overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[#252525] p-0 text-[#E6E6E6] shadow-2xl transition-[width] duration-200 ease-out",
          "max-w-none sm:max-w-none",
        )}
        style={{ width: showPreview ? "1006px" : "600px" }}
      >
        <Command
          shouldFilter={false}
          loop
          className="flex h-full flex-col bg-[#252525] text-[#E6E6E6] **:[[cmdk-group]]:px-0"
          value={selectedValue}
          onValueChange={setSelectedValue}
        >
          {/* ── Header: modal-level, tam genişlik. Search solda, controls en sağda ── */}
          <div className="flex w-full items-center gap-2 px-3 py-3">
            <MagnifyingGlassIcon className="mx-1 size-5 shrink-0 text-[rgba(255,255,255,0.55)]" />
            <CommandPrimitive.Input
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#E6E6E6] outline-none placeholder:text-[rgba(255,255,255,0.35)]"
              placeholder={`Search or ask a question in ${user?.name ?? ""}'s Space…`}
              value={rawQuery}
              onValueChange={setRawQuery}
              onKeyDown={handleInputKeyDown}
              autoFocus
            />
            {/* Modal-level controls: preview pane üstüne hizalı, input'tan bağımsız */}
            <div className="mr-2.5 flex shrink-0 items-center gap-1">
              {isWide && (
                <button
                  type="button"
                  aria-label={
                    previewOpen ? "Hide highlight pane" : "Show highlight pane"
                  }
                  title={previewOpen ? "Hide highlight pane" : "Show highlight pane"}
                  onClick={() => setPreviewOpen((v) => !v)}
                  data-active={previewOpen}
                  className={cn(
                    "flex size-[28px] shrink-0 items-center justify-center rounded-[6px] bg-transparent p-0 transition-colors duration-100 hover:bg-[rgba(255,255,255,0.055)]",
                    previewOpen
                      ? "text-[#5DB1FF] data-[active=true]:hover:bg-[rgba(77,157,224,0.1)]"
                      : "text-[rgba(255,255,255,0.45)] hover:text-[#E6E6E6]",
                  )}
                >
                  <SidebarRightIcon className="size-5" />
                </button>
              )}
              <button
                type="button"
                aria-label={filtersOpen ? "Hide filters" : "Show filters"}
                title={filtersOpen ? "Hide filters" : "Show filters"}
                onClick={() => setFiltersOpen((v) => !v)}
                data-active={filtersOpen}
                className={cn(
                  "flex size-[28px] shrink-0 items-center justify-center rounded-[6px] bg-transparent p-0 transition-colors duration-100 hover:bg-[rgba(255,255,255,0.055)]",
                  filtersOpen
                    ? "text-[#5DB1FF] data-[active=true]:hover:bg-[rgba(77,157,224,0.1)]"
                    : "text-[rgba(255,255,255,0.45)] hover:text-[#E6E6E6]",
                )}
              >
                <FilterCircleIcon className="size-5" />
              </button>
            </div>
          </div>

          {/* ── Body row: sabit 600px search sütunu + sağdaki 406px preview pane ── */}
          <div className="flex min-h-0 flex-1 flex-row items-stretch">
            {/* Sol sütun sabit 600px — preview açıkken daralmaz */}
            <div className="flex w-[600px] min-w-[600px] shrink-0 flex-col">

          {/* ── Filter bar (collapsible) ── */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              filtersOpen
                ? "max-h-[48px] opacity-100"
                : "max-h-0 opacity-0",
            )}
          >
            <div className="flex items-center gap-[6px] overflow-x-auto px-3 py-2.5">
              <button
                type="button"
                onClick={() => setTitleOnly((v) => !v)}
                className={cn(chipBase, titleOnly ? chipActive : "text-[rgba(255,255,255,0.6)]")}
                aria-pressed={titleOnly}
              >
                <TextFormatIcon className="h-4 w-auto opacity-80" />
                Title only
              </button>

              {/* In */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      chipBase,
                      scopeId ? chipActive : "text-[rgba(255,255,255,0.6)]",
                    )}
                  >
                    In{scopeLabel ? `: ${scopeLabel}` : ""}
                    <ChevronDownSmallIcon className="h-3.5 w-auto opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="max-h-[300px] w-64 overflow-y-auto border-[rgba(255,255,255,0.08)] bg-[#2a2a2a] p-1.5"
                >
                  <div className="flex flex-col gap-[2px]">
                    <button
                      type="button"
                      onClick={() => {
                        setScopeId(undefined);
                        setScopeLabel(undefined);
                      }}
                      className={cn(pickerRow, !scopeId && "data-[active=true]:bg-[rgba(255,255,255,0.07)]")}
                      data-active={!scopeId}
                    >
                      <span className="min-w-0 flex-1 truncate">Everywhere</span>
                      {!scopeId && <Check className="size-4 shrink-0" />}
                    </button>
                    {scopeTree.map((doc) => (
                      <button
                        key={doc._id}
                        type="button"
                        onClick={() => {
                          setScopeId(doc._id);
                          setScopeLabel(getDocumentLabel(doc.title, doc.type));
                        }}
                        style={{ paddingLeft: `${8 + Math.min(doc.depth, 4) * 12}px` }}
                        className={cn(
                          pickerRow,
                          scopeId === doc._id &&
                            "data-[active=true]:bg-[rgba(255,255,255,0.07)]",
                        )}
                        data-active={scopeId === doc._id}
                      >
                        <span className="flex size-[18px] shrink-0 items-center justify-center">
                          {doc.icon ? (
                            <span className="text-[13px] leading-none">
                              {doc.icon}
                            </span>
                          ) : doc.type === "database" ? (
                            <DatabaseIcon className="size-[16px] text-[rgba(255,255,255,0.55)]" />
                          ) : (
                            <PageIcon className="size-[15px] text-[rgba(255,255,255,0.55)]" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {getDocumentLabel(doc.title, doc.type)}
                        </span>
                        {scopeId === doc._id && (
                          <Check className="size-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Future filter builder — henüz desteklenmeyen filtreler için yer tutucu */}
              <button
                type="button"
                disabled
                title="More filters (coming soon)"
                className="inline-flex h-[24px] shrink-0 cursor-not-allowed items-center gap-1 rounded-[12px] px-[5px] pr-[9px] text-[14px] whitespace-nowrap transition-colors duration-150 select-none text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.055)] hover:text-[rgba(255,255,255,0.6)]"
              >
                <PlusIcon className="size-3.5 opacity-60" />
                Filter
              </button>
            </div>
          </div>

          {/* ── Results (scrollable) ── */}
          <CommandList className="flex-1 max-h-none scroll-py-2 px-2.5 pb-2">
            <CommandEmpty>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2 py-6 text-[13px] text-[rgba(255,255,255,0.45)]">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </span>
              ) : (
                <div className="flex flex-col items-center gap-1 py-6 text-[13px]">
                  <span className="text-[rgba(255,255,255,0.6)]">
                    No results
                  </span>
                  <span className="text-[rgba(255,255,255,0.35)]">
                    Try another search or remove filters.
                  </span>
                  {(titleOnly || scopeId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitleOnly(false);
                        setScopeId(undefined);
                        setScopeLabel(undefined);
                      }}
                      className="mt-1 text-[12px] text-[#5DB1FF] hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </CommandEmpty>

            {groups.map((group) => (
              <CommandGroup
                key={group.label}
                heading={group.label}
                className="p-0 **:[[cmdk-group-heading]]:mt-[14px] **:[[cmdk-group-heading]]:mb-2.5 **:[[cmdk-group-heading]]:px-4 **:[[cmdk-group-heading]]:py-0 **:[[cmdk-group-heading]]:text-[12px] **:[[cmdk-group-heading]]:text-[rgba(255,255,255,0.45)]"
              >
                {group.items.map((doc) => {
                  const title = getDocumentLabel(doc.title, doc.type);
                  const path = doc.breadcrumbs
                    .map((b) => getDocumentLabel(b.title, b.type))
                    .join(" / ");
                  return (
                    <CommandItem
                      key={doc._id}
                      value={doc._id}
                      onSelect={() => onOpenDoc(doc._id)}
                      className="group/result my-[1px] flex min-h-[36px] cursor-pointer items-center gap-2 rounded-[12px] px-2 py-1 hover:bg-[rgba(255,255,255,0.045)] data-[selected=true]:bg-[rgba(255,255,255,0.065)] data-[selected=true]:hover:bg-[rgba(255,255,255,0.075)]"
                    >
                      {/* Gerçek sonuç ikonu: emoji / database / page */}
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {doc.icon ? (
                          <span className="text-[14px] leading-none">
                            {doc.icon}
                          </span>
                        ) : doc.type === "database" ? (
                          <DatabaseIcon className="size-5 text-[rgba(255,255,255,0.55)]" />
                        ) : (
                          <PageIcon className="size-[18px] text-[rgba(255,255,255,0.55)]" />
                        )}
                      </span>

                      <span className="flex min-w-0 flex-1 items-center gap-1">
                        <span className="truncate text-[14px] font-[500] leading-[20px] text-[#E6E6E6]">
                          {title}
                        </span>
                        {path && (
                          <span className="hidden max-w-[45%] shrink-0 truncate text-[12px] text-[rgba(255,255,255,0.45)] md:inline">
                            <span aria-hidden className="mr-1">
                              —
                            </span>
                            {path}
                          </span>
                        )}
                      </span>

                      <EnterIcon className="size-3 shrink-0 text-[rgba(255,255,255,0.4)] opacity-0 transition-opacity duration-100 group-hover/result:opacity-60 group-data-[selected=true]/result:opacity-60" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
            </div>

        {/* ── Sağ highlight/preview pane: 406px, search list daralmaz ── */}
        <div
          className={cn(
            "h-full shrink-0 overflow-hidden transition-[width,opacity,transform] duration-200 ease-out",
            showPreview
              ? "w-[406px] scale-100 opacity-100"
              : "pointer-events-none w-0 scale-[0.98] opacity-0",
          )}
        >
          <div className="h-full w-[406px] overflow-hidden pl-6 pr-10 pt-[34px]">
            <div className="relative flex h-[420px] w-[340px] flex-col overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#2a2a2a] shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
              {/* Floating action toolbar: sticky top-8, cover üzerine biner */}
              <div
                className={cn(
                  "sticky top-2 z-10 flex justify-end pr-2",
                  previewCover ? "mb-[-24px]" : "mb-0",
                )}
              >
                <div className="flex w-fit items-center gap-0.5">
                  <button
                    type="button"
                    title="Copy link"
                    onClick={onCopyLink}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[rgba(255,255,255,0.62)] transition-colors duration-100 hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.14)]"
                  >
                    <LinkIcon className="h-4 w-auto" />
                  </button>
                  <button
                    type="button"
                    title="Open page"
                    onClick={onOpenInNewTab}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[rgba(255,255,255,0.62)] transition-colors duration-100 hover:bg-[rgba(255,255,255,0.1)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.14)]"
                  >
                    <ArrowDiagonalUpRightIcon className="h-4 w-auto" />
                  </button>
                </div>
              </div>

              {/* Cover: varsa 340×80 crop, yoksa sahte placeholder yok */}
              {previewCover && (
                <div className="relative h-[80px] w-[340px] shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewCover}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `center ${previewCoverY}%` }}
                  />
                  <div className="absolute right-0 bottom-0 left-0 border-b border-[rgba(255,255,255,0.06)]" />
                </div>
              )}

              {/* Body: 28px / 24px / 24px, gap 6px — taşarsa içerik scroll eder, bar görünmez */}
              <div className="flex flex-grow min-h-0 flex-col gap-[6px] overflow-x-hidden overflow-y-auto p-6 pt-7 [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
                {previewParentPath && (
                  <p className="truncate text-[12px] text-[rgba(255,255,255,0.45)] whitespace-nowrap overflow-hidden text-ellipsis">
                    {previewParentPath}
                  </p>
                )}
                <h4 className="text-[20px] leading-[24px] font-[600] break-words text-[#E6E6E6]">
                  {previewTitle}
                </h4>
                {previewContent && (
                  <div className="pt-3 text-[13px] leading-[18px] text-[rgba(255,255,255,0.6)] whitespace-pre-wrap">
                    {previewContent}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
          </div>

          {/* ── Footer: modal-level, tam genişlik ── */}
          <div className="mt-px flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] py-2 pr-3 pl-4 text-[12px] text-[rgba(255,255,255,0.45)]">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-[4px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 font-mono text-[11px] text-[rgba(255,255,255,0.6)]">
                Ctrl
              </kbd>
              +
              <kbd className="rounded-[4px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 font-mono text-[11px] text-[rgba(255,255,255,0.6)]">
                ↵
              </kbd>
              Open in new tab
            </span>
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              className="flex size-[28px] items-center justify-center rounded-[6px] bg-transparent p-0 text-[rgba(255,255,255,0.4)] transition-colors duration-100 hover:bg-[rgba(255,255,255,0.055)] hover:text-[#E6E6E6]"
            >
              <SlidersIcon className="size-5" />
            </button>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};