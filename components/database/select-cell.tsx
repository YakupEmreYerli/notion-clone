"use client";

import { useState } from "react";
import { useMutation } from "convex/react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";

import { nextOptionColor } from "./colors";
import { OptionBadge } from "./option-badge";
import { SelectOptionEditor } from "./select-option-editor";
import { DatabaseProperty } from "./types";

interface SelectCellProps {
  property: DatabaseProperty;
  value: string | string[] | null | undefined;
  multiple: boolean;
  editable: boolean;
  isActive: boolean;
  isEditing: boolean;
  onCommit: (value: string | string[] | null) => void;
  onEditingDone?: () => void;
}

export const SelectCell = ({
  property,
  value,
  multiple,
  editable,
  isActive,
  isEditing,
  onCommit,
  onEditingDone,
}: SelectCellProps) => {
  const [open, setOpen] = useState(false);
  const addSelectOption = useMutation(api.databases.addSelectOption);
  const updateSelectOption = useMutation(api.databases.updateSelectOption);
  const deleteSelectOption = useMutation(api.databases.deleteSelectOption);

  const options = property.options ?? [];
  const selectedIds = multiple
    ? Array.isArray(value)
      ? value
      : []
    : typeof value === "string"
      ? [value]
      : [];

  // Orphan-toleranslı: options'ta artık bulunamayan id'ler render edilmez.
  const selectedOptions = selectedIds
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  const onToggle = (optionId: string) => {
    if (multiple) {
      const next = selectedIds.includes(optionId)
        ? selectedIds.filter((id) => id !== optionId)
        : [...selectedIds, optionId];
      onCommit(next);
    } else {
      onCommit(selectedIds.includes(optionId) ? null : optionId);
      setOpen(false);
      // `isEditing` klavyeyle (Enter) açılmışsa `open` state'i tek başına
      // popover'ı kapatmaya yetmez — grid'i de "editing"den çıkarmak gerekir.
      onEditingDone?.();
    }
  };

  const onCreate = async (label: string) => {
    const optionId = await addSelectOption({
      propertyId: property._id,
      label,
      color: nextOptionColor(options.length),
    });
    if (multiple) {
      onCommit([...selectedIds, optionId]);
    } else {
      onCommit(optionId);
      setOpen(false);
      onEditingDone?.();
    }
  };

  return (
    <Popover
      open={editable && isActive && (isEditing || open)}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        disabled={!editable}
        className="flex h-full min-h-0 w-full items-center gap-1 overflow-hidden px-3 py-0 text-left"
      >
        {selectedOptions.map((option) => (
          <OptionBadge
            key={option.id}
            label={option.label}
            color={option.color}
          />
        ))}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <SelectOptionEditor
          options={options}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onCreate={onCreate}
          onRename={(optionId, label) =>
            updateSelectOption({ propertyId: property._id, optionId, label })
          }
          onRecolor={(optionId, color) =>
            updateSelectOption({ propertyId: property._id, optionId, color })
          }
          onDelete={(optionId) =>
            deleteSelectOption({ propertyId: property._id, optionId })
          }
        />
      </PopoverContent>
    </Popover>
  );
};
