"use client";

import { useMemo, useState } from "react";
import { File, Lock } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { getDocumentLabel } from "@/lib/utils";

interface PagePickerProps {
  /** Var olan bir belgeyi taşırken kendisini ve alt sayfalarını hariç tutmak için. */
  excludeId?: Id<"documents">;
  /** undefined + "Private" seçilirse workspace kökü demektir. */
  onSelect: (
    parentDocument: Id<"documents"> | undefined,
    label: string,
  ) => void;
  /** Listenin başında "Private" (workspace kökü) seçeneğini gösterir. */
  includeRoot?: boolean;
  children?: React.ReactNode;
  /** Verilmezse iç state kullanılır. Bir dropdown menü öğesinden (ör. sidebar
   * "Move to") tetiklendiğinde, ebeveyn menü kapandıktan sonra popover'ı
   * açık tutabilmek için dışarıdan kontrol edilebilir. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** DropdownMenu içinden açılırken anchor/focus çakışmasını önler. */
  dialog?: boolean;
}

/** excludeId'nin kendisini ve tüm alt sayfalarını hariç tutar — döngü oluşmasın. */
const useSelectableDocuments = (
  excludeId: Id<"documents"> | undefined,
  documents: Doc<"documents">[] | undefined,
) =>
  useMemo(() => {
    if (!documents) return undefined;
    if (!excludeId) return documents;

    const excluded = new Set<Id<"documents">>([excludeId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const doc of documents) {
        if (
          doc.parentDocument &&
          excluded.has(doc.parentDocument) &&
          !excluded.has(doc._id)
        ) {
          excluded.add(doc._id);
          grew = true;
        }
      }
    }

    return documents.filter((doc) => !excluded.has(doc._id));
  }, [excludeId, documents]);

export const PagePicker = ({
  excludeId,
  onSelect,
  includeRoot,
  children,
  open: openProp,
  onOpenChange,
  dialog = false,
}: PagePickerProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const documents = useQuery(api.documents.getSearch);

  const selectable = useSelectableDocuments(excludeId, documents);

  const onPick = (
    parentDocument: Id<"documents"> | undefined,
    label: string,
  ) => {
    onSelect(parentDocument, label);
    setOpen(false);
  };

  const content = (
    <Command>
      <CommandInput placeholder="Search page to add to..." />
      <CommandList>
        <CommandEmpty>No pages found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {includeRoot && (
            <CommandItem
              value="Private"
              onSelect={() => onPick(undefined, "Private")}
            >
              <Lock className="h-4 w-4" />
              <span>Private</span>
            </CommandItem>
          )}
          {selectable?.map((doc) => (
            <CommandItem
              key={doc._id}
              value={`${getDocumentLabel(doc.title, doc.type)}|${doc._id}`}
              onSelect={() =>
                onPick(doc._id, getDocumentLabel(doc.title, doc.type))
              }
            >
              {doc.icon ? (
                <span className="text-[1.125rem] leading-none">{doc.icon}</span>
              ) : (
                <File className="h-4 w-4" />
              )}
              <span className="truncate">
                {getDocumentLabel(doc.title, doc.type)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (dialog) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-80 max-w-[calc(100%-2rem)] p-0">
          <DialogTitle className="sr-only">Move page to</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        {content}
      </PopoverContent>
    </Popover>
  );
};
