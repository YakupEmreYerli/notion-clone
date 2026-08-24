"use client";

import { Button } from "@/components/ui/button";

/**
 * Yayınlanmış sayfa görüntüleyicisinin hata sınırı. Ziyaretçi anonim
 * olabileceği için uygulama içine (`/documents`) link verilmez.
 */
const PreviewError = ({ reset }: { error: Error; reset: () => void }) => {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-medium">This page couldn&apos;t be loaded</h2>
      <p className="text-muted-foreground text-sm">
        It may have been unpublished or deleted.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
};

export default PreviewError;
