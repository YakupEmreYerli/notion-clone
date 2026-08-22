"use client";

import {
  ComponentRef,
  ElementRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

import { useCoverImage } from "@/hooks/useCoverImage";

import { Button } from "./ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { IconPicker } from "./icon-picker";
import { ImageIcon, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorFont, useEditorFont } from "@/hooks/useEditorFont";
import { fontFamilies } from "@/lib/editorFont";
import { getDocumentLabel } from "@/lib/utils";
import { useLiveTitleDrafts } from "@/hooks/useLiveTitleDrafts";

interface ToolbarProps {
  initialData: Doc<"documents">;
  editorFont?: string;
  preview?: boolean;
  onFocusEditor?: () => void;
  /** Database şeması gibi sola tam dayalı, sayfa içeriğiyle aynı hizada başlık. */
  flushLeft?: boolean;
}

export interface ToolbarHandle {
  focusEnd: () => void;
}

export const Toolbar = forwardRef<ToolbarHandle, ToolbarProps>(
  ({ initialData, preview, editorFont, onFocusEditor, flushLeft }, ref) => {
    const inputRef = useRef<ComponentRef<"textarea">>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialData.title);
    // "Ikon var" ve "ikon yok" durumları ayrı bir trigger elemanı (dolayısıyla
    // ayrı bir IconPicker/Popover örneği) render ediyor. Açık/kapalı durumu
    // burada tutuluyor ki iki örnek arasında geçişte durum kaybolmasın.
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

    const update = useMutation(api.documents.update);
    const removeIcon = useMutation(api.documents.removeIcon);
    const setTitleDraft = useLiveTitleDrafts((state) => state.setDraft);
    const clearTitleDraft = useLiveTitleDrafts((state) => state.clearDraft);

    const coverImage = useCoverImage();

    // Kullanıcı yazıp 400ms dolmadan sayfadan ayrılırsa (unmount), bekleyen
    // debounce timer'ı iptal edilir ama taslak store'da kalır kalırdı —
    // hem son yazılanın kaybolmaması (persistence) hem sidebar'ın kalıcı
    // olmayan bir taslakta takılı kalmaması için unmount'ta flush ediyoruz.
    const pendingRef = useRef({
      id: initialData._id,
      value,
      savedTitle: initialData.title,
    });
    pendingRef.current = {
      id: initialData._id,
      value,
      savedTitle: initialData.title,
    };

    useEffect(() => {
      return () => {
        const { id, value: pendingValue, savedTitle } = pendingRef.current;
        if (pendingValue !== savedTitle) {
          update({ id, title: pendingValue });
        }
        clearTitleDraft(id);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData._id]);

    const enableInput = () => {
      if (preview) return;
      setIsEditing(true);
      inputRef.current?.focus();
    };

    const disableInput = () => {
      setIsEditing(false);
    };

    useImperativeHandle(ref, () => ({
      focusEnd: () => {
        const el = inputRef.current;
        if (!el) return;
        setIsEditing(true);
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      },
    }));

    useEffect(() => {
      if (!isEditing) {
        setValue(initialData.title);
      }
    }, [initialData.title]);

    useEffect(() => {
      if (value === initialData.title) {
        clearTitleDraft(initialData._id);
        return;
      }

      const timer = setTimeout(() => {
        update({
          id: initialData._id,
          title: value,
        }).then(() => clearTitleDraft(initialData._id));
      }, 400);

      return () => clearTimeout(timer);
    }, [value, initialData._id, initialData.title, update, clearTitleDraft]);

    // Backend yazımı yine debounce'lu (üstteki effect) — spam yok, persistence
    // değişmedi. Ama sidebar/breadcrumb gibi Convex query'lerine bağlı UI'ların
    // ne göstereceği artık bu taslağa bakıyor, o yüzden gecikme hissi olmadan
    // anında güncelleniyor (Notion'da doğrulanan davranış).
    const onInput = (value: string) => {
      setValue(value);
      setTitleDraft(initialData._id, value);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        update({
          id: initialData._id,
          title: value,
        });
        setTimeout(() => {
          inputRef.current?.blur();
        }, 400);
        return;
      }

      // Notion'daki gibi: başlığın son satırındayken ArrowDown ile
      // editöre geçilir — yukarıda editörden başlığa dönüşün tersi.
      if (event.key === "ArrowDown" && onFocusEditor) {
        const el = inputRef.current;
        if (!el) return;
        const afterCursor = el.value.slice(el.selectionEnd ?? el.value.length);
        if (!afterCursor.includes("\n")) {
          event.preventDefault();
          onFocusEditor();
        }
      }
    };

    const onIconSelect = (icon: string) => {
      update({
        id: initialData._id,
        icon,
      });
    };

    const onRemoveIcon = () => {
      removeIcon({
        id: initialData._id,
      });
    };

    return (
      <div
        className={cn("group relative", flushLeft ? "px-4 md:px-8" : "pl-12")}
      >
        {!!initialData.icon && !preview && (
          <div
            className={cn(
              "group/icon relative z-10 flex w-max items-center gap-x-2",
              !initialData.coverImage && "pt-6",
              initialData.coverImage && "-mt-8",
            )}
          >
            <IconPicker
              onChange={onIconSelect}
              onRemove={onRemoveIcon}
              open={isIconPickerOpen}
              onOpenChange={setIsIconPickerOpen}
            >
              <p className="text-6xl transition hover:opacity-75">
                {initialData.icon}
              </p>
            </IconPicker>
            <Button
              onClick={onRemoveIcon}
              className="text-muted-foreground dark:bg-dark dark:hover:bg-dark/80 rounded-full text-xs opacity-0 transition group-hover/icon:opacity-100"
              variant="outline"
              size="icon"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!!initialData.icon && preview && (
          <p
            className={cn(
              "text-6xl",
              !initialData.coverImage && "pt-6",
              initialData.coverImage && "-mt-8",
            )}
          >
            {initialData.icon}
          </p>
        )}
        <div className="flex items-center gap-x-1 py-2">
          {!initialData.icon && !preview && (
            <IconPicker
              asChild
              onChange={onIconSelect}
              onRemove={onRemoveIcon}
              open={isIconPickerOpen}
              onOpenChange={setIsIconPickerOpen}
            >
              <Button
                // "Add icon" sadece seçiciyi açar. Önce rastgele bir emoji
                // atanıyordu; bu, trigger'ı "Add icon" butonundan büyük emoji
                // elemanına çevirip Popover'ı unmount/remount ettiği için
                // seçici açılırken gözle görülür bir titreme yaratıyordu.
                className="text-muted-foreground text-xs"
                variant="ghost"
                size="sm"
              >
                <Smile className="mr-1.5 size-3.5" />
                Add icon
              </Button>
            </IconPicker>
          )}
          {!initialData.coverImage && !preview && (
            <Button
              onClick={() => coverImage.onOpen(initialData._id)}
              className="text-muted-foreground text-xs"
              variant="ghost"
              size="sm"
            >
              <ImageIcon className="mr-1.5 size-3.5" />
              Add Cover
            </Button>
          )}
        </div>

        <TextareaAutosize
          ref={inputRef}
          placeholder={getDocumentLabel(undefined, initialData.type)}
          spellCheck="false"
          onBlur={disableInput}
          onFocus={() => setIsEditing(true)}
          onKeyDown={onKeyDown}
          value={value}
          disabled={preview}
          onChange={(e) => onInput(e.target.value)}
          style={{ fontFamily: fontFamilies[editorFont as EditorFont] }}
          className={cn(
            "w-full resize-none bg-transparent font-bold wrap-break-word outline-hidden",
            "text-[#3F3F3F] placeholder:text-gray-300 disabled:cursor-default dark:text-[#CFCFCF] dark:placeholder:text-neutral-600",
            !isEditing && "cursor-pointer",
            initialData.smallText ? "text-4xl" : "text-5xl",
          )}
        />
      </div>
    );
  },
);
Toolbar.displayName = "Toolbar";
