"use client";

import { useQuery } from "convex/react";
import { DatabaseIcon } from "@/app/(main)/_components/icons/DatabaseIcon";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseGrid } from "./database-grid";
import { DatabaseSkeleton } from "./database-skeleton";

interface DatabaseViewProps {
  documentId: Id<"documents">;
  editable?: boolean;
}

const DatabaseView = ({ documentId, editable = true }: DatabaseViewProps) => {
  const properties = useQuery(api.databases.getSchema, {
    databaseId: documentId,
  });
  const rows = useQuery(api.databases.getRows, { databaseId: documentId });

  if (properties === undefined || rows === undefined) {
    return <DatabaseSkeleton />;
  }

  return (
    <div className="px-4 md:px-8">
      <div className="mb-3 flex items-center gap-x-2">
        <span className="bg-secondary text-foreground/80 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium">
          <DatabaseIcon className="h-3.5 w-3.5" />
          Table
        </span>
      </div>
      <DatabaseGrid
        databaseId={documentId}
        properties={properties}
        rows={rows}
        editable={editable}
      />
    </div>
  );
};

export default DatabaseView;
