"use client";

import { useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Doküman kapsamlı geri al / yinele.
 *
 * Yığın sunucuda (`convex/history.ts`) — istemci tersini kendisi
 * hesaplamaz. Bu, iki sekmenin aynı geçmişi görmesini ve yığının reload'ı
 * atlatmasını sağlar.
 */
export const useUndo = (scopeId: Id<"documents"> | undefined) => {
  const state = useQuery(
    api.history.getUndoState,
    scopeId ? { scopeId } : "skip",
  );
  const undoMutation = useMutation(api.history.undo);
  const redoMutation = useMutation(api.history.redo);

  // Toast YOK: Notion'da Ctrl+Z sessizdir — geri alma zaten ekranda
  // görülüyor, üstüne bildirim koymak gürültü. Boş yığında da sessiz
  // kalır (sunucu `null` döner, hata değil). Etiketler yine de
  // `getUndoState` üzerinden menü/ipucu için duruyor.
  const undo = useCallback(async () => {
    if (!scopeId) return;
    await undoMutation({ scopeId });
  }, [scopeId, undoMutation]);

  const redo = useCallback(async () => {
    if (!scopeId) return;
    await redoMutation({ scopeId });
  }, [scopeId, redoMutation]);

  return {
    undo,
    redo,
    canUndo: state?.canUndo ?? false,
    canRedo: state?.canRedo ?? false,
    undoLabel: state?.undoLabel ?? null,
    redoLabel: state?.redoLabel ?? null,
  };
};

/**
 * Metin girişi içinde miyiz? Öyleyse Ctrl+Z tarayıcının kendi metin
 * geri almasına ait — hücrede yazarken basılan Ctrl+Z, satır silmeyi
 * geri almak yerine yazılan harfi geri almalı. Aynı kural BlockNote
 * (ProseMirror) için de geçerli: editörün kendi history plugin'i var,
 * elinden almıyoruz.
 */
function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  // readOnly input'lar (idle moddaki grid hücresi) metin düzenlemiyor —
  // orada Ctrl+Z bize ait.
  return !(target as HTMLInputElement).readOnly;
}

/**
 * Ctrl/Cmd+Z ve Ctrl/Cmd+Shift+Z / Ctrl+Y kısayollarını bağlar.
 * `document` üzerinde dinler, çünkü odak grid hücresinde de olabilir,
 * hiçbir yerde de.
 */
export const useUndoShortcuts = (scopeId: Id<"documents"> | undefined) => {
  const { undo, redo } = useUndo(scopeId);

  useEffect(() => {
    if (!scopeId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      if (isTextEditingTarget(event.target)) return;

      const isRedo = key === "y" || event.shiftKey;
      event.preventDefault();
      void (isRedo ? redo() : undo());
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [scopeId, undo, redo]);
};
