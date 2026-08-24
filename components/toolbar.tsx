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

import { Button } from "./ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { IconPicker } from "./icon-picker";
import { ImageIcon, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorFont, useEditorFont } from "@/hooks/useEditorFont";
import { fontFamilies } from "@/lib/editorFont";
import { getDocumentLabel } from "@/lib/utils";
import { useLiveTitleDrafts } from "@/hooks/useLiveTitleDrafts";
import { GALLERY_CATEGORIES } from "@/lib/coverGallery";

interface ToolbarProps {
  initialData: Doc<"documents">;
  editorFont?: string;
  preview?: boolean;
  onFocusEditor?: () => void;
}

export interface ToolbarHandle {
  focusEnd: () => void;
}

export const Toolbar = forwardRef<ToolbarHandle, ToolbarProps>(
  ({ initialData, preview, editorFont, onFocusEditor }, ref) => {
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
      // Notion: başlıkta Enter → ilk block'a geçer (başlık yeni satır almaz).
      if (event.key === "Enter") {
        event.preventDefault();
        update({
          id: initialData._id,
          title: value,
        });
        onFocusEditor?.();
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

    // Notion ölçümü: "Add cover" bir picker açmaz, galeriden rastgele bir
    // kapak anında atar — kullanıcı beğenmezse "Change" ile değiştirir.
    const onAddCover = () => {
      const allImages = GALLERY_CATEGORIES.flatMap((c) => c.images);
      const random = allImages[Math.floor(Math.random() * allImages.length)];
      update({
        id: initialData._id,
        coverImage: random.url,
      });
    };

    return (
      <div
        className={cn(
          "group relative mb-[7px]",
        )}
      >
        {!!initialData.icon && !preview && (
          <div
            className={cn(
              "group/icon relative z-10 flex w-max items-center gap-x-2",
              !initialData.coverImage && "pt-6",
              initialData.coverImage && "-mt-[42px]",
            )}
          >
            <IconPicker
              onChange={onIconSelect}
              onRemove={onRemoveIcon}
              open={isIconPickerOpen}
              onOpenChange={setIsIconPickerOpen}
            >
              <p className="text-[78px] leading-none transition hover:opacity-75">
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
              "text-[78px] leading-none",
              !initialData.coverImage && "pt-6",
              initialData.coverImage && "-mt-[42px]",
            )}
          >
            {initialData.icon}
          </p>
        )}
        <div
          className={cn(
            "flex items-center gap-x-1 py-1",
            // Notion: cover + icon'suz durumda cover→title boşluğu 48px
            // (icon→title 40px'ten 8px fazla).
            initialData.coverImage && !initialData.icon && "mt-2",
          )}
        >
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
                // Notion'un düz metin hover'ı yerine kasıtlı olarak dolgun
                // bir pill: daha net bir tıklama hedefi hissettiriyor.
                className="text-muted-foreground rounded-full text-xs"
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
              onClick={onAddCover}
              className="text-muted-foreground rounded-full text-xs"
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
            "text-foreground placeholder:text-muted-foreground/50 disabled:cursor-default",
            // Notion title padding: 0 8px (içerik sütun solundan 8px).
            "pl-2",
            !isEditing && "cursor-pointer",
            // Notion başlık tipografisi (ölçülen): 40px/700/lh-48; small text 32px.
            initialData.smallText
              ? "text-[32px] leading-[40px]"
              : "text-[40px] leading-[48px]",
          )}
        />
      </div>
    );
  },
);
Toolbar.displayName = "Toolbar";
