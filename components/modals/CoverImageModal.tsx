"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoverImage } from "@/hooks/useCoverImage";
import { useEffect, useEffectEvent, useState } from "react";
import { deleteFile, uploadFile } from "@/lib/storage";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/spinner";
import { CoverGallery } from "./CoverGallery";

export const CoverImageModal = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const update = useMutation(api.documents.update);
  const removeCoverImage = useMutation(api.documents.removeCoverImage);
  const coverImage = useCoverImage();

  const [isDragging, setIsDragging] = useState(false);

  const onClose = () => {
    setLinkUrl("");
    setIsSubmitting(false);
    setIsDragging(false);
    coverImage.onClose();
  };

  const onChange = async (file?: File) => {
    // Kapak, popover'ın açıldığı ana route değil, açılışta sabitlenen
    // `coverImage.documentId`ye uygulanır — PeekModal içinden (bir alt
    // sayfadan) açıldığında bile doğru dokümanı hedefler.
    if (file && coverImage.documentId) {
      const documentId = coverImage.documentId;
      setIsSubmitting(true);

      const previousUrl = coverImage.url;

      try {
        const url = await uploadFile(file);

        await update({
          id: documentId,
          coverImage: url,
        });

        await deleteFile(previousUrl);
      } catch (error) {
        console.error("Failed to upload cover image:", error);
        toast.error("Failed to upload cover image.");
        setIsSubmitting(false);
        return;
      }

      onClose();
    }
  };

  const onDropFile = useEffectEvent(onChange);

  useEffect(() => {
    if (!coverImage.isOpen) return;

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.clientX === 0 && event.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const droppedFile = event.dataTransfer?.files[0];
      if (!droppedFile) return;
      if (!droppedFile.type.startsWith("image/")) {
        toast.error("Only image files are allowed.");
        return;
      }
      await onDropFile(droppedFile);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [coverImage.isOpen]);

  const onSelectGalleryImage = async (url: string) => {
    if (!coverImage.documentId) return;
    setIsSubmitting(true);
    try {
      await update({
        id: coverImage.documentId,
        coverImage: url,
      });
      await deleteFile(coverImage.url);
      onClose();
    } catch (error) {
      console.error("Failed to update cover image:", error);
      toast.error("Failed to update cover image.");
      setIsSubmitting(false);
    }
  };

  const normalizedLink = linkUrl.trim();
  let isValidLink = false;
  try {
    const parsedLink = new URL(normalizedLink);
    isValidLink =
      parsedLink.protocol === "http:" || parsedLink.protocol === "https:";
  } catch {}

  const onSubmitLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidLink) return;
    await onSelectGalleryImage(normalizedLink);
  };

  const onRemove = async () => {
    if (!coverImage.documentId) return;
    setIsSubmitting(true);
    try {
      await removeCoverImage({ id: coverImage.documentId });
      await deleteFile(coverImage.url);
      onClose();
    } catch (error) {
      console.error("Failed to remove cover image:", error);
      toast.error("Failed to remove cover image.");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={coverImage.isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        aria-label="Page cover"
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className={cn(
          "top-[90px] right-3 left-auto w-[540px] max-w-[calc(100vw-24px)] translate-x-0 translate-y-0",
          "block gap-0 overflow-hidden rounded-[10px] border-0 p-0 shadow-[0_20px_24px_rgba(25,25,25,0.05),0_5px_8px_rgba(25,25,25,0.027),0_0_0_1px_rgba(42,28,0,0.07)] sm:max-w-[540px]",
          "dark:shadow-[0_20px_24px_rgba(0,0,0,0.24),0_5px_8px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.09)]",
          isDragging && "ring-2 ring-[#2383e2]",
        )}
      >
        <DialogTitle className="sr-only">Page cover</DialogTitle>
        <DialogDescription className="sr-only">
          Upload a cover image, paste an image link, or choose from the gallery.
        </DialogDescription>
        <Tabs defaultValue="gallery" className="relative gap-0">
          <TabsList
            variant="line"
            style={{ height: 40 }}
            className="border-border h-10 w-full justify-start gap-0 overflow-x-auto rounded-none border-b px-2 py-0 pr-20"
          >
            <TabsTrigger
              value="gallery"
              className="h-7 flex-none px-2 font-normal after:inset-x-2 after:bottom-[-6px] focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none"
            >
              Gallery
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="h-7 flex-none px-2 font-normal after:inset-x-2 after:bottom-[-6px] focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none"
            >
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="link"
              className="h-7 flex-none px-2 font-normal after:inset-x-2 after:bottom-[-6px] focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none"
            >
              Link
            </TabsTrigger>
          </TabsList>
          {coverImage.url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isSubmitting}
              className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-1.5 right-2 z-10 h-7 rounded-md px-2 text-sm transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
          <TabsContent value="gallery" className="m-0">
            <CoverGallery
              onSelect={onSelectGalleryImage}
              selectedUrl={coverImage.url}
            />
          </TabsContent>
          <TabsContent
            value="upload"
            className="m-0 px-4 pt-4 pb-2 text-center"
          >
            <label
              className={cn(
                "border-border hover:bg-accent flex h-8 w-full cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors",
                isSubmitting && "pointer-events-none opacity-50",
              )}
            >
              <input
                type="file"
                accept="image/*"
                disabled={isSubmitting}
                className="sr-only"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0];
                  if (nextFile) void onChange(nextFile);
                  event.target.value = "";
                }}
              />
              {isSubmitting ? <Spinner size="sm" /> : "Upload file"}
            </label>
            <p className="text-muted-foreground mt-3 text-xs">
              Images wider than 1500 pixels work best.
            </p>
          </TabsContent>
          <TabsContent value="link" className="m-0 px-4 pt-4 pb-2">
            <form onSubmit={onSubmitLink}>
              <div className="border-border flex h-8 items-center rounded-md border px-2">
                <input
                  type="url"
                  aria-label="Image link"
                  placeholder="Paste an image link..."
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  className="placeholder:text-muted-foreground h-5 w-full bg-transparent text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!isValidLink || isSubmitting}
                className="mx-auto mt-2 flex h-7 w-[300px] max-w-full items-center justify-center rounded-md bg-[#2383e2] px-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
              >
                {isSubmitting ? <Spinner size="sm" /> : "Submit"}
              </button>
              <p className="text-muted-foreground mt-3 text-center text-xs">
                Works with any image from the web.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
