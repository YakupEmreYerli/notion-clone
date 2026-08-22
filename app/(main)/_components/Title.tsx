"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { getDocumentLabel } from "@/lib/utils";
import { useLiveTitleDrafts } from "@/hooks/useLiveTitleDrafts";

interface TitleProps {
  initialData: Doc<"documents">;
}

export const Title = ({ initialData }: TitleProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const update = useMutation(api.documents.update);
  const setTitleDraft = useLiveTitleDrafts((state) => state.setDraft);
  const clearTitleDraft = useLiveTitleDrafts((state) => state.clearDraft);

  const [title, setTitle] = useState(initialData.title);
  const [isEditing, setIsEditing] = useState(false);
  // Kaydedilmeyi bekleyen kullanıcı girdisi (yoksa null). Bu input, aynı
  // dokümanın başlığını düzenleyen tek yer değil — Toolbar'daki büyük başlık
  // da aynı alanı yazıyor. Bu ref olmadan, Toolbar'dan gelen değişiklik
  // buradaki eski `title` state'iyle karşılaştırılıp "fark var" diye eski
  // başlığı geri yazıyor ve kullanıcının yazdığı başlık siliniyordu.
  const pendingRef = useRef<string | null>(null);

  const enableInput = () => {
    setTitle(initialData.title);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
    }, 0);
  };

  const disabledInput = () => {
    setIsEditing(false);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTitle(value);
    pendingRef.current = value;
    // Sidebar için anında geri bildirim; backend yazımı aşağıdaki debounce
    // effect'i üzerinden gider — her tuşta mutation göndermeyiz.
    setTitleDraft(initialData._id, value);
  };

  // Başlık başka bir yerden (Toolbar, başka sekme) değiştiyse ve burada
  // kaydedilmemiş girdi yoksa, yerel state'i sunucudaki değere hizala.
  useEffect(() => {
    if (pendingRef.current !== null) return;
    setTitle(initialData.title);
  }, [initialData.title]);

  useEffect(() => {
    if (pendingRef.current === null) return;

    if (title === initialData.title) {
      pendingRef.current = null;
      clearTitleDraft(initialData._id);
      return;
    }

    const timer = setTimeout(() => {
      update({ id: initialData._id, title }).then(() => {
        // Bu arada yeni tuşa basıldıysa pending'i düşürme, o yazım hâlâ
        // kaydedilmeyi bekliyor.
        if (pendingRef.current === title) {
          pendingRef.current = null;
          clearTitleDraft(initialData._id);
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [title, initialData._id, initialData.title, update, clearTitleDraft]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      disabledInput();
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-x-1">
      {!!initialData.icon && <p>{initialData.icon}</p>}
      {isEditing ? (
        <Input
          ref={inputRef}
          placeholder={getDocumentLabel(undefined, initialData.type)}
          onClick={enableInput}
          onBlur={disabledInput}
          onChange={onChange}
          onKeyDown={onKeyDown}
          value={title}
          className="h-7 px-2 focus-visible:ring-transparent lg:min-w-120"
        />
      ) : (
        <Button
          onClick={enableInput}
          title={getDocumentLabel(initialData.title, initialData.type)}
          variant="ghost"
          size="sm"
          className="h-auto max-w-[45vw] min-w-0 shrink overflow-hidden p-1 text-left font-normal md:max-w-[80vw]"
        >
          <span className="block min-w-0 truncate">
            {getDocumentLabel(initialData?.title, initialData?.type)}
          </span>
        </Button>
      )}
    </div>
  );
};

Title.Skeleton = function TitleSkeleton() {
  return <Skeleton className="h-6 w-20 rounded-md" />;
};
