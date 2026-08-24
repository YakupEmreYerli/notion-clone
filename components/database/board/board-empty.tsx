"use client";

// Boş durumlar — Notion'a göre ayrı mesajlar:
// - Database'de hiç satır yok: "This database is empty"
// - Satırlar var ama filtre/gizleme sonucu board boş: "No cards match your filters"
interface BoardEmptyProps {
  hasRows: boolean;
}

export const BoardEmpty = ({ hasRows }: BoardEmptyProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
        <svg
          viewBox="0 0 24 24"
          className="text-muted-foreground h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v5" />
        </svg>
      </div>
      <p className="text-sm font-medium">
        {hasRows ? "No cards match your filters" : "This database is empty"}
      </p>
      <p className="text-muted-foreground mt-1 text-sm">
        {hasRows
          ? "Try changing or clearing your filters."
          : "Add a new page to get started."}
      </p>
    </div>
  );
};