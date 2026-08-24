"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

import type { Id } from "@/convex/_generated/dataModel";
import { useCoverImage } from "@/hooks/useCoverImage";

const Cover = dynamic(() => import("@/components/cover").then((m) => m.Cover), {
  ssr: false,
});

const documentId = "cover-modal-fixture" as Id<"documents">;
const coverUrl =
  "https://app.notion.com/images/page-cover/solid_red.png";

export function CoverModalFixture() {
  const onReplace = useCoverImage((state) => state.onReplace);

  useEffect(() => {
    onReplace(documentId, coverUrl);
  }, [onReplace]);

  return (
    <main className="bg-background min-h-screen" data-cover-modal-fixture>
      <Cover documentId={documentId} url={coverUrl} />
    </main>
  );
}
