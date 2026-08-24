"use client";

import { Doc } from "@/convex/_generated/dataModel";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useOrigin } from "@/hooks/useOrigin";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Copy, Globe } from "lucide-react";

function NotionLockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="3.97 0 12.06 20"
      className="text-muted-foreground shrink-0 fill-current"
      style={{ width: 12.06, height: 20 }}
    >
      <path d="M10.55 12.808a1.35 1.35 0 1 0-1.1 0v1.242a.55.55 0 0 0 1.1 0z" />
      <path d="M10 1.95a4 4 0 0 0-4 4v1.433a2.426 2.426 0 0 0-2.025 2.392v5.4A2.425 2.425 0 0 0 6.4 17.6h7.2a2.425 2.425 0 0 0 2.425-2.425v-5.4A2.426 2.426 0 0 0 14 7.383V5.95a4 4 0 0 0-4-4m2.75 5.4h-5.5v-1.4a2.75 2.75 0 0 1 5.5 0zM5.225 9.775c0-.649.526-1.175 1.175-1.175h7.2c.649 0 1.175.526 1.175 1.175v5.4c0 .649-.526 1.175-1.175 1.175H6.4a1.175 1.175 0 0 1-1.175-1.175z" />
    </svg>
  );
}

interface PublishProps {
  initialData: Doc<"documents">;
}

export const Publish = ({ initialData }: PublishProps) => {
  const origin = useOrigin();
  const update = useMutation(api.documents.update);

  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const url = `${origin}/preview/${initialData._id}`;

  const onPublish = () => {
    setIsSubmitting(true);

    const promise = update({
      id: initialData._id,
      isPublished: true,
    }).finally(() => setIsSubmitting(false));

    toast.promise(promise, {
      loading: "Publishing...",
      success: "Note published!",
      error: "Failed to publish note.",
    });
  };

  const onUnpublish = () => {
    setIsSubmitting(true);

    const promise = update({
      id: initialData._id,
      isPublished: false,
    }).finally(() => setIsSubmitting(false));

    toast.promise(promise, {
      loading: "Unpublishing...",
      success: "Note unpublished",
      error: "Failed to unpublish note.",
    });
  };

  const onCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label={initialData.isPublished ? "Share (published)" : "Share"}
          title={initialData.isPublished ? "Published" : "Share"}
          className="h-7 gap-1.5 rounded-[6px] px-2 font-normal has-[>svg]:px-2"
        >
          {initialData.isPublished ? (
            <Globe className="size-4 text-sky-500" />
          ) : (
            <NotionLockIcon />
          )}
          <span className="text-sm">Share</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" alignOffset={8} forceMount>
        {initialData.isPublished ? (
          <div className="space-y-4">
            <div className="flex items-center gap-x-2">
              <Globe className="h-4 w-4 animate-pulse text-sky-500" />
              <p className="text-xs font-medium text-sky-500">
                This note is live on the web.
              </p>
            </div>
            <div className="flex items-center">
              <input
                value={url}
                className="bg-muted h-8 flex-1 rounded-l-md border px-2 text-xs"
                disabled
              />
              <Button
                onClick={onCopy}
                disabled={copied}
                className="h-8 rounded-l-none"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={isSubmitting}
              onClick={onUnpublish}
            >
              Unpublish
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Globe className="text-muted-foreground mb-2 h-8 w-8" />
            <p>Publish this page</p>
            <span className="text-muted-foreground mb-4 text-xs">
              Share your work with others
            </span>
            <Button
              disabled={isSubmitting}
              onClick={onPublish}
              className="w-full text-xs"
              size="sm"
            >
              Publish
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
