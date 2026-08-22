"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getDocumentLabel } from "@/lib/utils";

interface BreadcrumbProps {
  documentId: Id<"documents">;
}

// Notion'da doğrulanan davranış: breadcrumb sadece ata zincirini gösterir
// (mevcut sayfa Title tarafından zaten gösteriliyor), bir segmente tıklamak
// o sayfaya navigate eder. Sidebar'daki seçili satır, route parametresine
// bağlı olan Item'in `active` prop'u sayesinde otomatik senkron kalır — ek
// bir state gerekmez. Notion'daki gibi ince/düz durması için ayraç ağır bir
// chevron ikonu değil, sade bir "/". Navbar'ı kalınlaştırmamak için ayrı bir
// satır değil, Title ile AYNI satırda render edilir — bu yüzden son ata ile
// başlık arasına da bir ayraç konur ("Ata / Alt / Başlık").
export const Breadcrumb = ({ documentId }: BreadcrumbProps) => {
  const router = useRouter();
  const ancestors = useQuery(api.documents.getAncestors, { documentId });

  if (!ancestors || ancestors.length === 0) {
    return null;
  }

  return (
    <div className="text-muted-foreground/70 flex min-w-0 shrink items-center gap-x-1 text-sm">
      {ancestors.map((ancestor, index) => (
        <span key={ancestor._id} className="flex min-w-0 items-center gap-x-1">
          {index > 0 && (
            <span className="text-muted-foreground/40 shrink-0">/</span>
          )}
          <button
            type="button"
            onClick={() => router.push(`/documents/${ancestor._id}`)}
            title={getDocumentLabel(ancestor.title, ancestor.type)}
            className="hover:text-foreground max-w-40 min-w-0 truncate transition"
          >
            {ancestor.icon && (
              <span className="mr-1 leading-none">{ancestor.icon}</span>
            )}
            {getDocumentLabel(ancestor.title, ancestor.type)}
          </button>
        </span>
      ))}
      <span className="text-muted-foreground/40 shrink-0">/</span>
    </div>
  );
};
