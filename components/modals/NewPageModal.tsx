"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ChevronDown, File, Lock, Table2, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PagePicker } from "@/components/page-picker";
import { useNewPage } from "@/hooks/useNewPage";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "page", label: "Empty page", icon: File },
  { key: "database", label: "Empty database", icon: Table2 },
] as const;

export const NewPageModal = () => {
  const router = useRouter();
  const newPage = useNewPage();

  const [search, setSearch] = useState("");
  const [parentDocument, setParentDocument] = useState<Id<"documents">>();
  const [parentLabel, setParentLabel] = useState("Private");

  const create = useMutation(api.documents.create);
  const createDatabase = useMutation(api.databases.createDatabase);

  const onOpenChange = (open: boolean) => {
    if (open) return;
    newPage.onClose();
    setSearch("");
    setParentDocument(undefined);
    setParentLabel("Private");
  };

  const onCreate = (type: (typeof OPTIONS)[number]["key"]) => {
    const promise = (
      type === "database"
        ? createDatabase({ title: "", parentDocument })
        : create({ title: "", parentDocument, type: "page" })
    ).then((documentId) => router.push(`/documents/${documentId}`));

    toast.promise(promise, {
      loading: type === "database" ? "Creating a new database…" : "Creating a new note…",
      success: type === "database" ? "New database created." : "New note created.",
      error: "Failed to create.",
    });

    onOpenChange(false);
  };

  const visibleOptions = OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={newPage.isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-24 max-w-2xl translate-y-0 gap-0 rounded-xl p-0"
      >
        <DialogTitle className="sr-only">New page</DialogTitle>
        <div className="flex items-center gap-x-2 border-b px-4 py-3">
          <DialogClose asChild>
            <Button variant="ghost" size="sm" aria-label="Close">
              <X className="text-muted-foreground h-4 w-4" />
            </Button>
          </DialogClose>
          <span className="text-muted-foreground shrink-0 text-sm">Add to</span>
          <PagePicker
            includeRoot
            onSelect={(id, label) => {
              setParentDocument(id);
              setParentLabel(label);
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-x-1.5 font-normal"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{parentLabel}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </PagePicker>
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-9 flex-1 border-none bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {visibleOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onCreate(key)}
              className={cn(
                "hover:bg-accent flex flex-col items-start gap-y-3 rounded-lg border p-4 text-left transition",
              )}
            >
              <Icon className="text-muted-foreground h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
