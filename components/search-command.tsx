"use client";

import { useEffect, useState } from "react";
import { File } from "lucide-react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearch } from "@/hooks/useSearch";
import { api } from "@/convex/_generated/api";
import { getDocumentLabel } from "@/lib/utils";

const DEBOUNCE_MS = 200;

export const SearchCommand = () => {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

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
    const timer = setTimeout(() => setDebouncedQuery(rawQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  useEffect(() => {
    if (!isOpen) {
      setRawQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  const recent = useQuery(
    api.documents.getRecentlyOpened,
    debouncedQuery ? "skip" : {},
  );
  const results = useQuery(
    api.documents.searchDocuments,
    debouncedQuery ? { query: debouncedQuery } : "skip",
  );

  const documents = debouncedQuery ? results : recent;

  const onSelect = (id: string) => {
    router.push(`/documents/${id}`);
    onClose();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={onClose}
      title="Search Documents"
      description={`Search ${session?.user?.name ?? ""}'s Zotion`}
      showCloseButton={false}
    >
      <Command shouldFilter={false} loop>
        <CommandInput
          value={rawQuery}
          onValueChange={setRawQuery}
          placeholder={`Search ${session?.user?.name}'s Zotion..`}
        />
        <CommandList>
          <CommandEmpty>
            {documents === undefined ? "Searching…" : "No results found."}
          </CommandEmpty>
          <CommandGroup
            heading={debouncedQuery ? "Results" : "Recently opened"}
            className="pb-1"
          >
            {documents?.map((document) => (
              <CommandItem
                key={document._id}
                value={document._id}
                title={getDocumentLabel(document.title, document.type)}
                onSelect={() => onSelect(document._id)}
              >
                {document.icon ? (
                  <p className="mr-2 text-[1.125rem] leading-0">
                    {document.icon}
                  </p>
                ) : (
                  <File className="mr-2 h-4 w-4" />
                )}
                <span>{getDocumentLabel(document.title, document.type)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};
